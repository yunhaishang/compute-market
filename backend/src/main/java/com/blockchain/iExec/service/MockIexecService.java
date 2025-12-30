package com.blockchain.iExec.service;

import com.blockchain.iExec.service.IexecCliService.IexecTaskStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 模拟 iExec 服务 - 用于测试网开发
 * 不需要真实的 iExec 算力，模拟任务执行过程
 */
@Service
public class MockIexecService {
    
    private static final Logger logger = LoggerFactory.getLogger(MockIexecService.class);
    
    // 模拟任务状态存储
    private final Map<String, MockTask> mockTasks = new ConcurrentHashMap<>();
    private final Random random = new Random();
    
    /**
     * 创建模拟任务
     * @param userAddress 用户地址
     * @param params 计算参数
     * @return 模拟的 iExec 任务 ID
     */
    public String createMockTask(String userAddress, String params) {
        String mockTaskId = "0x" + UUID.randomUUID().toString().replace("-", "") + 
                           String.format("%032d", random.nextInt(1000));
        
        MockTask task = new MockTask();
        task.setTaskId(mockTaskId);
        task.setUserAddress(userAddress);
        task.setParams(params);
        task.setStatus("ACTIVE");
        task.setCreatedTime(System.currentTimeMillis());
        
        // 模拟任务执行时间：30-120秒
        long executionTime = 30000 + random.nextInt(90000);
        task.setCompletionTime(task.getCreatedTime() + executionTime);
        
        mockTasks.put(mockTaskId, task);
        
        logger.info("✅ [MOCK] Created mock iExec task: {} for user: {}", mockTaskId, userAddress);
        logger.info("    📝 Params: {}", params);
        logger.info("    ⏱️  Expected completion in: {} seconds", executionTime / 1000);
        
        return mockTaskId;
    }
    
    /**
     * 查询模拟任务状态
     * @param taskId 任务ID
     * @return 任务状态
     */
    public IexecTaskStatus getMockTaskStatus(String taskId) {
        MockTask mockTask = mockTasks.get(taskId);
        
        if (mockTask == null) {
            logger.warn("❌ [MOCK] Task not found: {}", taskId);
            return null;
        }
        
        IexecTaskStatus status = new IexecTaskStatus();
        status.setTaskId(taskId);
        status.setDealId("0xmockdeal" + taskId.substring(10, 20));
        
        long currentTime = System.currentTimeMillis();
        long elapsedTime = currentTime - mockTask.getCreatedTime();
        
        // 模拟任务生命周期
        if (currentTime < mockTask.getCompletionTime()) {
            // 任务运行中
            if (elapsedTime < 10000) {
                status.setStatus("ACTIVE");
                mockTask.setStatus("ACTIVE");
            } else if (elapsedTime < mockTask.getCompletionTime() - 10000) {
                status.setStatus("RUNNING");
                mockTask.setStatus("RUNNING");
            } else {
                status.setStatus("REVEALING");
                mockTask.setStatus("REVEALING");
            }
            
            logger.debug("🔄 [MOCK] Task {} status: {} (elapsed: {}s / expected: {}s)", 
                taskId.substring(0, 10) + "...", 
                status.getStatus(),
                elapsedTime / 1000,
                (mockTask.getCompletionTime() - mockTask.getCreatedTime()) / 1000);
            
        } else {
            // 任务完成
            // 90% 成功率，10% 失败率（更真实的模拟）
            boolean success = random.nextInt(100) < 90 || mockTask.isCompleted();
            
            if (success) {
                status.setStatus("COMPLETED");
                mockTask.setStatus("COMPLETED");
                mockTask.setCompleted(true);
                
                // 模拟结果
                String resultHash = "Qm" + UUID.randomUUID().toString().replace("-", "").substring(0, 44);
                status.setResultStorage("ipfs");
                status.setResultLocation(resultHash);
                mockTask.setResultHash(resultHash);
                
                logger.info("✅ [MOCK] Task {} COMPLETED", taskId.substring(0, 10) + "...");
                logger.info("    📦 Result: ipfs://{}", resultHash);
                
            } else {
                status.setStatus("FAILED");
                mockTask.setStatus("FAILED");
                mockTask.setCompleted(true);
                
                logger.warn("❌ [MOCK] Task {} FAILED (simulated failure)", taskId.substring(0, 10) + "...");
            }
        }
        
        return status;
    }
    
    /**
     * 手动设置任务为完成状态（用于测试）
     * @param taskId 任务ID
     * @param success 是否成功
     */
    public void setTaskCompleted(String taskId, boolean success) {
        MockTask mockTask = mockTasks.get(taskId);
        if (mockTask == null) {
            logger.warn("Task not found: {}", taskId);
            return;
        }
        
        mockTask.setCompletionTime(System.currentTimeMillis());
        mockTask.setCompleted(true);
        
        if (success) {
            mockTask.setStatus("COMPLETED");
            String resultHash = "Qm" + UUID.randomUUID().toString().replace("-", "").substring(0, 44);
            mockTask.setResultHash(resultHash);
            logger.info("✅ [MOCK] Manually completed task: {}", taskId);
        } else {
            mockTask.setStatus("FAILED");
            logger.info("❌ [MOCK] Manually failed task: {}", taskId);
        }
    }
    
    /**
     * 获取所有模拟任务
     */
    public Map<String, MockTask> getAllMockTasks() {
        return mockTasks;
    }
    
    /**
     * 清理已完成的模拟任务（避免内存泄漏）
     */
    public void cleanupOldTasks() {
        long cutoffTime = System.currentTimeMillis() - 3600000; // 1小时前
        mockTasks.entrySet().removeIf(entry -> 
            entry.getValue().isCompleted() && entry.getValue().getCompletionTime() < cutoffTime
        );
    }
    
    /**
     * 模拟任务类
     */
    public static class MockTask {
        private String taskId;
        private String userAddress;
        private String params;
        private String status;
        private long createdTime;
        private long completionTime;
        private boolean completed;
        private String resultHash;
        
        // Getters and Setters
        public String getTaskId() {
            return taskId;
        }
        
        public void setTaskId(String taskId) {
            this.taskId = taskId;
        }
        
        public String getUserAddress() {
            return userAddress;
        }
        
        public void setUserAddress(String userAddress) {
            this.userAddress = userAddress;
        }
        
        public String getParams() {
            return params;
        }
        
        public void setParams(String params) {
            this.params = params;
        }
        
        public String getStatus() {
            return status;
        }
        
        public void setStatus(String status) {
            this.status = status;
        }
        
        public long getCreatedTime() {
            return createdTime;
        }
        
        public void setCreatedTime(long createdTime) {
            this.createdTime = createdTime;
        }
        
        public long getCompletionTime() {
            return completionTime;
        }
        
        public void setCompletionTime(long completionTime) {
            this.completionTime = completionTime;
        }
        
        public boolean isCompleted() {
            return completed;
        }
        
        public void setCompleted(boolean completed) {
            this.completed = completed;
        }
        
        public String getResultHash() {
            return resultHash;
        }
        
        public void setResultHash(String resultHash) {
            this.resultHash = resultHash;
        }
    }
}
