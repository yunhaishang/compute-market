package com.blockchain.iExec.listener;

import com.blockchain.iExec.model.TaskEntity;
import com.blockchain.iExec.service.TaskService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.EthLog;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.DefaultBlockParameterNumber;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.math.BigInteger;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
public class TaskCreatedListener {
    
    private static final Logger logger = LoggerFactory.getLogger(TaskCreatedListener.class);
    
    @Autowired
    private Web3j web3j;
    
    @Autowired
    private TaskService taskService;
    
    @PostConstruct
    public void startListening() {
        ScheduledExecutorService executorService = Executors.newScheduledThreadPool(1);
        // 每 10 秒检查一次新事件
        executorService.scheduleAtFixedRate(this::checkNewEvents, 0, 10, TimeUnit.SECONDS);
    }
    
    private void checkNewEvents() {
        try {
            // 获取最新块号
            BigInteger latestBlock = web3j.ethBlockNumber().send().getBlockNumber();
            
            // 监听智能合约地址的 TaskCreated 事件
            // 使用 DefaultBlockParameterNumber 包装块号
            EthFilter ethFilter = new EthFilter(
                new DefaultBlockParameterNumber(latestBlock.subtract(BigInteger.valueOf(10))), // fromBlock
                new DefaultBlockParameterNumber(latestBlock), // toBlock
                "YOUR_CONTRACT_ADDRESS" // contract address
            );
            
            EthLog ethLog = web3j.ethGetLogs(ethFilter).send();
            
            @SuppressWarnings("unchecked")
            List<EthLog.LogResult<?>> logs = (List<EthLog.LogResult<?>>) (List<?>) ethLog.getLogs();
            for (EthLog.LogResult<?> logResult : logs) {
                Log log = (Log) logResult;
                processTaskCreatedEvent(log);
            }
            
        } catch (IOException e) {
            logger.error("Error checking for new events", e);
        }
    }
    
    private void processTaskCreatedEvent(Log log) {
        // 解析事件参数
        // 这里需要根据智能合约的 ABI 来正确解析日志中的参数
        // 示例：假设 taskId 在第一个主题，其他参数在 data 字段
        
        String taskId = log.getTopics().get(1); // 示例，需要根据实际调整
        String userAddress = log.getTopics().get(2);
        
        logger.info("New TaskCreated event received: taskId={}, user={}", taskId, userAddress);
        
        // 创建新任务实体
        TaskEntity task = new TaskEntity();
        task.setTaskId(taskId);
        task.setUserAddress(userAddress);
        task.setStatus("Created");
        
        // 保存任务到数据库
        taskService.saveTask(task);
    }
}