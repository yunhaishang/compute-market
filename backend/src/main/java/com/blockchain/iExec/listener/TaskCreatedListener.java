package com.blockchain.iExec.listener;

import com.blockchain.iExec.model.TaskEntity;
import com.blockchain.iExec.service.TaskService;
import com.blockchain.iExec.service.ArbitrumTaskService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.EthLog;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.EthBlockNumber;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.DefaultBlockParameterNumber;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.math.BigInteger;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * 监听本地链（Hardhat）的 TaskCreated 事件
 * 当检测到新任务时，自动提交到 Arbitrum Sepolia 进行计算
 */
@Component
public class TaskCreatedListener {
    
    private static final Logger logger = LoggerFactory.getLogger(TaskCreatedListener.class);
    
    @Autowired
    @Qualifier("localWeb3j")
    private Web3j localWeb3j;
    
    @Autowired
    private TaskService taskService;
    
    @Autowired
    private ArbitrumTaskService arbitrumTaskService;
    
    @Value("${contract.address}")
    private String contractAddress;
    
    private BigInteger lastProcessedBlock = BigInteger.ZERO;
    
    // TaskCreated 事件定义
    // 合约中的事件签名：TaskCreated(uint256 indexed taskId, uint256 indexed serviceId, address indexed buyer, uint256 amount, uint256 timestamp)
    private static final Event TASK_CREATED_EVENT = new Event("TaskCreated",
        Arrays.asList(
            new TypeReference<Uint256>(true) {}, // taskId (indexed)
            new TypeReference<Uint256>(true) {}, // serviceId (indexed)
            new TypeReference<Address>(true) {}, // buyer (indexed)
            new TypeReference<Uint256>() {},     // amount (non-indexed)
            new TypeReference<Uint256>() {}      // timestamp (non-indexed)
        )
    );
    
    @PostConstruct
    public void startListening() {
        logger.info("Starting TaskCreatedListener for contract: {}", contractAddress);
        
        try {
            // 初始化时从当前区块开始，避免重新处理历史事件
            EthBlockNumber blockNumber = localWeb3j.ethBlockNumber().send();
            lastProcessedBlock = blockNumber.getBlockNumber();
            logger.info("Initialized lastProcessedBlock to current block: {}", lastProcessedBlock);
        } catch (Exception e) {
            logger.error("Failed to get current block number, starting from 0", e);
            lastProcessedBlock = BigInteger.ZERO;
        }
        
        ScheduledExecutorService executorService = Executors.newScheduledThreadPool(1);
        // 每 10 秒检查一次新事件
        executorService.scheduleAtFixedRate(this::checkNewEvents, 5, 10, TimeUnit.SECONDS);
    }
    
    private void checkNewEvents() {
        try {
            // 获取最新块号
            BigInteger latestBlock = localWeb3j.ethBlockNumber().send().getBlockNumber();
            
            // 第一次运行时，只查询最近 100 个块
            if (lastProcessedBlock.equals(BigInteger.ZERO)) {
                lastProcessedBlock = latestBlock.subtract(BigInteger.valueOf(100));
                if (lastProcessedBlock.compareTo(BigInteger.ZERO) < 0) {
                    lastProcessedBlock = BigInteger.ZERO;
                }
            }
            
            // 如果没有新块，跳过
            if (latestBlock.compareTo(lastProcessedBlock) <= 0) {
                return;
            }
            
            logger.debug("Checking blocks {} to {} for TaskCreated events", lastProcessedBlock, latestBlock);
            
            // 创建事件过滤器
            String eventSignature = EventEncoder.encode(TASK_CREATED_EVENT);
            EthFilter ethFilter = new EthFilter(
                new DefaultBlockParameterNumber(lastProcessedBlock.add(BigInteger.ONE)),
                new DefaultBlockParameterNumber(latestBlock),
                contractAddress
            );
            ethFilter.addSingleTopic(eventSignature);
            
            // 获取事件日志
            EthLog ethLog = localWeb3j.ethGetLogs(ethFilter).send();
            
            @SuppressWarnings("unchecked")
            List<EthLog.LogResult<?>> logs = (List<EthLog.LogResult<?>>) (List<?>) ethLog.getLogs();
            
            logger.debug("Found {} TaskCreated events", logs.size());
            
            for (EthLog.LogResult<?> logResult : logs) {
                Log log = (Log) logResult.get();
                processTaskCreatedEvent(log);
            }
            
            // 更新最后处理的块号
            lastProcessedBlock = latestBlock;
            
        } catch (IOException e) {
            logger.error("Error checking for new events", e);
        } catch (Exception e) {
            logger.error("Unexpected error in event listener", e);
        }
    }
    
    private void processTaskCreatedEvent(Log log) {
        try {
            // 解析事件参数
            // 合约事件：TaskCreated(uint256 indexed taskId, uint256 indexed serviceId, address indexed buyer, uint256 amount, uint256 timestamp)
            List<String> topics = log.getTopics();
            
            if (topics.size() < 4) {
                logger.warn("Invalid TaskCreated event: insufficient topics (expected 4, got {})", topics.size());
                return;
            }
            
            // taskId (indexed, 第 2 个 topic，topic[0] 是事件签名)
            String taskIdHex = topics.get(1);
            BigInteger taskId = new BigInteger(taskIdHex.substring(2), 16);
            
            // serviceId (indexed, 第 3 个 topic)
            String serviceIdHex = topics.get(2);
            BigInteger serviceId = new BigInteger(serviceIdHex.substring(2), 16);
            
            // buyer address (indexed, 第 4 个 topic)
            String buyerAddressHex = topics.get(3);
            String buyerAddress = "0x" + buyerAddressHex.substring(26); // 去掉填充的零
            
            // 解析 data 字段中的非索引参数（amount, timestamp）
            String data = log.getData();
            List<org.web3j.abi.datatypes.Type> nonIndexedValues = FunctionReturnDecoder.decode(
                data,
                TASK_CREATED_EVENT.getNonIndexedParameters()
            );
            
            BigInteger amount = BigInteger.ZERO;
            BigInteger timestamp = BigInteger.ZERO;
            
            if (nonIndexedValues.size() >= 2) {
                amount = (BigInteger) nonIndexedValues.get(0).getValue();
                timestamp = (BigInteger) nonIndexedValues.get(1).getValue();
            }
            
            logger.info("New TaskCreated event: taskId={}, serviceId={}, buyer={}, amount={}, timestamp={}", 
                        taskId, serviceId, buyerAddress, amount, timestamp);
            
            // 检查任务是否已存在
            TaskEntity existingTask = taskService.getTaskByTaskId(taskId.toString());
            if (existingTask != null) {
                logger.info("Task {} already exists, skipping", taskId);
                return;
            }
            
            // 创建新任务实体
            TaskEntity task = new TaskEntity();
            task.setTaskId(taskId.toString());
            task.setUserAddress(buyerAddress);
            task.setServiceId(serviceId.toString());
            task.setStatus("Created");
            
            // 保存任务到数据库
            taskService.saveTask(task);
            logger.info("Task {} saved to database with status: Created", taskId);
            
            // 立即更新为 Processing 状态（确保前端能看到）
            taskService.updateTaskStatus(taskId.toString(), "Processing");
            logger.info("Task {} status updated to Processing (ready for computation)", taskId);
            
            // 提交任务到 Arbitrum Sepolia 进行计算
            logger.info("Submitting task {} to Arbitrum Sepolia...", taskId);
            arbitrumTaskService.submitTaskToArbitrum(taskId.toString(), serviceId, buyerAddress);
            
        } catch (Exception e) {
            logger.error("Error processing TaskCreated event", e);
        }
    }
}