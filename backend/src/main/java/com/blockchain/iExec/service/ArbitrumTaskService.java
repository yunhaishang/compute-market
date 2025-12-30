package com.blockchain.iExec.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.core.methods.response.EthGetTransactionCount;
import org.web3j.protocol.core.methods.response.EthGasPrice;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;

import com.blockchain.iExec.contract.ComputeMarketContract;
import com.blockchain.iExec.model.TaskEntity;

import java.math.BigInteger;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Arbitrum Sepolia 任务处理服务
 * 负责将本地链的任务提交到 Arbitrum Sepolia 进行计算
 */
@Service
public class ArbitrumTaskService {
    
    private static final Logger logger = LoggerFactory.getLogger(ArbitrumTaskService.class);
    
    @Autowired
    @Qualifier("arbitrumWeb3j")
    private Web3j arbitrumWeb3j;
    
    @Autowired
    @Qualifier("localWeb3j")
    private Web3j localWeb3j;
    
    @Autowired
    private TaskService taskService;
    
    @Autowired
    private ContractGasProvider gasProvider;
    
    @Value("${arbitrum.sepolia.contract-address:}")
    private String arbitrumContractAddress;
    
    @Value("${contract.address}")
    private String localContractAddress;
    
    @Value("${contract.admin.privatekey}")
    private String adminPrivateKey;
    
    @Value("${arbitrum.sepolia.privatekey}")
    private String arbitrumPrivateKey;
    
    @Value("${arbitrum.sepolia.enabled:false}")
    private boolean arbitrumEnabled;
    
    /**
     * 将任务提交到 Arbitrum Sepolia
     * @param taskId 本地链任务 ID
     * @param serviceId 服务 ID
     * @param userAddress 用户地址
     */
    public void submitTaskToArbitrum(String taskId, BigInteger serviceId, String userAddress) {
        if (!arbitrumEnabled) {
            logger.info("Arbitrum integration disabled. Using mock mode.");
            mockComputeTask(taskId, serviceId);
            return;
        }
        
        logger.info("Submitting task {} to Arbitrum Sepolia for computation...", taskId);
        
        CompletableFuture.runAsync(() -> {
            try {
                // 注意：状态已在 TaskCreatedListener 中更新为 Processing
                
                // 在 Arbitrum Sepolia 上创建相同的任务（如果需要）
                // 这里假设 Arbitrum 上也有相同的合约接口
                String arbitrumTaskId = createTaskOnArbitrum(taskId, serviceId, userAddress);
                
                // 3. 保存 Arbitrum 任务 ID
                TaskEntity task = taskService.getTaskByTaskId(taskId);
                if (task != null) {
                    task.setArbitrumTaskId(arbitrumTaskId);
                    task.setServiceId(serviceId.toString());
                    taskService.saveTask(task);
                }
                
                // 4. 监听 Arbitrum 上的任务完成事件
                monitorArbitrumTask(taskId, arbitrumTaskId);
                
            } catch (Exception e) {
                logger.error("Error submitting task {} to Arbitrum: {}", taskId, e.getMessage(), e);
                taskService.updateTaskErrorMessage(taskId, "Arbitrum submission failed: " + e.getMessage());
                
                // 如果 Arbitrum 提交失败，回退到模拟模式
                logger.info("Falling back to mock mode for task {}", taskId);
                mockComputeTask(taskId, serviceId);
            }
        });
    }
    
    /**
     * 在 Arbitrum Sepolia 上创建任务
     * 发送一个简单的交易到 Arbitrum，在交易数据中包含任务信息
     * 这是最简单且成本最低的方式（类似 "1+1" 计算）
     */
    private String createTaskOnArbitrum(String localTaskId, BigInteger serviceId, String userAddress) throws Exception {
        logger.info("Creating task on Arbitrum Sepolia for local task: {}", localTaskId);
        
        try {
            // 获取 Arbitrum 私钥
            if (arbitrumPrivateKey == null || arbitrumPrivateKey.isEmpty()) {
                throw new Exception("Arbitrum private key not configured");
            }
            
            // 创建凭证
            Credentials credentials = Credentials.create(arbitrumPrivateKey);
            logger.info("Using Arbitrum account: {}", credentials.getAddress());
            
            // 获取 nonce
            EthGetTransactionCount ethGetTransactionCount = arbitrumWeb3j
                .ethGetTransactionCount(credentials.getAddress(), DefaultBlockParameterName.PENDING)
                .send();
            BigInteger nonce = ethGetTransactionCount.getTransactionCount();
            logger.info("Current nonce: {}", nonce);
            
            // 构造交易数据：taskId + serviceId + userAddress（简单的十六进制编码）
            String taskData = "Task:" + localTaskId + ",Service:" + serviceId + ",User:" + userAddress;
            String hexData = "0x" + bytesToHex(taskData.getBytes());
            
            // 获取当前 gas price
            EthGasPrice gasPrice = arbitrumWeb3j.ethGasPrice().send();
            BigInteger baseGasPrice = gasPrice.getGasPrice();
            
            // 为了确保交易成功，使用 base fee 的 150% 作为 maxFeePerGas
            // 并设置合理的 maxPriorityFeePerGas（优先费）
            BigInteger maxPriorityFeePerGas = BigInteger.valueOf(100000000L); // 0.1 Gwei 优先费
            BigInteger maxFeePerGas = baseGasPrice.multiply(BigInteger.valueOf(3)).divide(BigInteger.valueOf(2)).add(maxPriorityFeePerGas); // base * 1.5 + priority
            
            logger.info("Base gas price: {} wei", baseGasPrice);
            logger.info("Max fee per gas: {} wei", maxFeePerGas);
            logger.info("Max priority fee per gas: {} wei", maxPriorityFeePerGas);
            
            // 创建 EIP-1559 类型的交易（Type 2）
            RawTransaction rawTransaction = RawTransaction.createTransaction(
                421614L, // chainId (Arbitrum Sepolia)
                nonce,
                BigInteger.valueOf(50000), // gas limit: 50000（简单交易足够）
                credentials.getAddress(), // 发送给自己
                BigInteger.ZERO, // 不转账
                hexData, // 任务数据
                maxPriorityFeePerGas,
                maxFeePerGas
            );
            
            // 签名交易
            byte[] signedMessage = TransactionEncoder.signMessage(rawTransaction, 421614L, credentials); // 421614 = Arbitrum Sepolia chain ID
            String hexValue = "0x" + bytesToHex(signedMessage);
            
            // 发送交易
            logger.info("Sending transaction to Arbitrum Sepolia...");
            EthSendTransaction ethSendTransaction = arbitrumWeb3j.ethSendRawTransaction(hexValue).send();
            
            if (ethSendTransaction.hasError()) {
                throw new Exception("Transaction failed: " + ethSendTransaction.getError().getMessage());
            }
            
            String txHash = ethSendTransaction.getTransactionHash();
            logger.info("✅ Arbitrum transaction sent successfully! TX Hash: {}", txHash);
            logger.info("View on explorer: https://sepolia.arbiscan.io/tx/{}", txHash);
            
            // 返回交易哈希作为 Arbitrum 任务 ID
            return txHash;
            
        } catch (Exception e) {
            logger.error("Failed to create task on Arbitrum: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * 字节数组转十六进制字符串
     */
    private String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
    
    /**
     * 监听 Arbitrum 交易确认
     * 等待交易被打包到区块并确认
     */
    private void monitorArbitrumTask(String localTaskId, String txHash) {
        logger.info("⏳ Monitoring Arbitrum transaction: {} for local task: {}", txHash, localTaskId);
        
        CompletableFuture.runAsync(() -> {
            try {
                int maxRetries = 60; // 最多等待 10 分钟（每次间隔 10 秒）
                int retries = 0;
                TransactionReceipt receipt = null;
                
                while (retries < maxRetries) {
                    Thread.sleep(10000); // 每 10 秒检查一次
                    retries++;
                    
                    try {
                        // 查询交易回执
                        Optional<TransactionReceipt> receiptOptional = arbitrumWeb3j
                            .ethGetTransactionReceipt(txHash)
                            .send()
                            .getTransactionReceipt();
                        
                        if (receiptOptional.isPresent()) {
                            receipt = receiptOptional.get();
                            
                            // 检查交易状态
                            String status = receipt.getStatus();
                            if ("0x1".equals(status)) {
                                logger.info("✅ Arbitrum transaction confirmed! Block: {}", receipt.getBlockNumber());
                                logger.info("Gas used: {}, Cumulative gas: {}", 
                                    receipt.getGasUsed(), receipt.getCumulativeGasUsed());
                                
                                // 模拟计算结果（"1+1=2"）
                                String computeResult = "0x" + bytesToHex("Result:1+1=2".getBytes());
                                
                                // 任务完成，更新本地链
                                handleArbitrumTaskCompleted(localTaskId, computeResult);
                                break;
                            } else {
                                logger.error("❌ Arbitrum transaction failed! Status: {}", status);
                                taskService.updateTaskErrorMessage(localTaskId, "Arbitrum transaction failed");
                                break;
                            }
                        } else {
                            logger.info("⏳ Waiting for confirmation... ({}/{})", retries, maxRetries);
                        }
                        
                    } catch (Exception e) {
                        logger.warn("Error checking transaction receipt: {}", e.getMessage());
                    }
                }
                
                if (receipt == null) {
                    logger.error("❌ Arbitrum transaction timeout after {} retries", maxRetries);
                    taskService.updateTaskErrorMessage(localTaskId, "Arbitrum transaction timeout");
                }
                
            } catch (Exception e) {
                logger.error("Error monitoring Arbitrum task: {}", e.getMessage(), e);
                taskService.updateTaskErrorMessage(localTaskId, "Monitoring error: " + e.getMessage());
            }
        });
    }
    
    /**
     * 处理 Arbitrum 任务完成
     * 将结果回写到本地链
     */
    private void handleArbitrumTaskCompleted(String localTaskId, String resultHash) {
        logger.info("Arbitrum task completed for local task: {}, result: {}", localTaskId, resultHash);
        
        try {
            // 1. 更新本地数据库
            taskService.updateTaskResult(localTaskId, resultHash);
            
            // 2. 调用本地链合约更新任务状态
            updateLocalChainTaskStatus(localTaskId, resultHash);
            
            logger.info("Local chain updated for task: {}", localTaskId);
            
        } catch (Exception e) {
            logger.error("Error updating local chain for task {}: {}", localTaskId, e.getMessage(), e);
            taskService.updateTaskErrorMessage(localTaskId, "Local chain update failed: " + e.getMessage());
        }
    }
    
    /**
     * 更新本地链任务状态
     */
    private void updateLocalChainTaskStatus(String taskId, String resultHash) throws Exception {
        if (adminPrivateKey == null || adminPrivateKey.isEmpty()) {
            logger.warn("Admin private key not configured, skipping chain update");
            return;
        }
        
        Credentials credentials = Credentials.create(adminPrivateKey);
        TransactionManager txManager = new RawTransactionManager(localWeb3j, credentials);
        
        // 加载本地合约
        ComputeMarketContract contract = ComputeMarketContract.load(
            localContractAddress,
            localWeb3j,
            txManager,
            gasProvider
        );
        
        // 调用 completeTask 方法
        BigInteger taskIdBigInt = new BigInteger(taskId);
        TransactionReceipt receipt = contract.completeTask(taskIdBigInt, resultHash).send();
        
        logger.info("Local chain transaction completed: {}", receipt.getTransactionHash());
    }
    
    /**
     * 模拟计算任务（用于测试或 Arbitrum 不可用时）
     */
    private void mockComputeTask(String taskId, BigInteger serviceId) {
        logger.info("Mock computing task: {} (status is already Processing)", taskId);
        
        CompletableFuture.runAsync(() -> {
            try {
                // 模拟计算延迟（15-20秒，确保前端有足够时间看到 Processing 状态）
                logger.info("Task {} computing... (will take 15-20 seconds)", taskId);
                Thread.sleep(15000 + (long)(Math.random() * 5000));
                
                // 生成模拟结果
                String mockResult = "0x" + taskId + "_mock_result_" + System.currentTimeMillis();
                logger.info("Task {} computation completed, result: {}", taskId, mockResult);
                
                // 更新本地链（先更新链上状态）
                updateLocalChainTaskStatus(taskId, mockResult);
                
                // 更新本地数据库为 Completed（在链上更新成功后）
                taskService.updateTaskResult(taskId, mockResult);
                
                logger.info("Mock task completed: {}", taskId);
                
            } catch (Exception e) {
                logger.error("Error in mock compute: {}", e.getMessage(), e);
                taskService.updateTaskErrorMessage(taskId, "Mock compute failed: " + e.getMessage());
            }
        });
    }
}
