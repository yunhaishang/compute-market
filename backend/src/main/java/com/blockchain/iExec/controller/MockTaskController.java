package com.blockchain.iExec.controller;

import com.blockchain.iExec.model.TaskEntity;
import com.blockchain.iExec.service.MockIexecService;
import com.blockchain.iExec.service.TaskService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 模拟任务控制器 - 用于测试网开发
 * 提供手动创建和管理模拟 iExec 任务的接口
 */
@RestController
@RequestMapping("/mock")
public class MockTaskController {
    
    private static final Logger logger = LoggerFactory.getLogger(MockTaskController.class);
    
    @Autowired
    private MockIexecService mockIexecService;
    
    @Autowired
    private TaskService taskService;
    
    @Value("${iexec.mock.enabled:true}")
    private boolean mockEnabled;
    
    /**
     * 创建模拟任务
     * 
     * @param userAddress 用户地址
     * @param params 计算参数（可选）
     * @return 任务信息
     */
    @PostMapping("/tasks/create")
    public ResponseEntity<?> createMockTask(
            @RequestParam String userAddress,
            @RequestParam(required = false, defaultValue = "echo 'Hello iExec'") String params) {
        
        if (!mockEnabled) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Mock mode is disabled",
                "message", "Set iexec.mock.enabled=true in application.properties"
            ));
        }
        
        try {
            logger.info("🎭 Creating mock task for user: {}", userAddress);
            
            // 1. 生成任务 ID
            String taskId = "task_" + UUID.randomUUID().toString();
            
            // 2. 创建模拟 iExec 任务
            String mockIexecTaskId = mockIexecService.createMockTask(userAddress, params);
            
            // 3. 保存到数据库
            TaskEntity task = new TaskEntity();
            task.setTaskId(taskId);
            task.setIexecTaskId(mockIexecTaskId);
            task.setUserAddress(userAddress);
            task.setStatus("Running");
            task.setCreatedAt(LocalDateTime.now());
            task.setUpdatedAt(LocalDateTime.now());
            
            taskService.saveTask(task);
            
            logger.info("✅ Mock task created successfully");
            logger.info("    📋 Task ID: {}", taskId);
            logger.info("    🔗 iExec Task ID: {}", mockIexecTaskId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("taskId", taskId);
            response.put("iexecTaskId", mockIexecTaskId);
            response.put("userAddress", userAddress);
            response.put("status", "Running");
            response.put("message", "Mock task created. It will complete in 30-120 seconds.");
            response.put("hint", "Check status at: GET /api/tasks/task-id/" + taskId);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Failed to create mock task", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to create mock task",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * 手动完成模拟任务（用于快速测试）
     * 
     * @param taskId 任务ID
     * @param success 是否成功（默认true）
     */
    @PostMapping("/tasks/{taskId}/complete")
    public ResponseEntity<?> completeMockTask(
            @PathVariable String taskId,
            @RequestParam(required = false, defaultValue = "true") boolean success) {
        
        if (!mockEnabled) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Mock mode is disabled"
            ));
        }
        
        try {
            TaskEntity task = taskService.getTaskByTaskId(taskId);
            
            if (task == null) {
                return ResponseEntity.notFound().build();
            }
            
            String iexecTaskId = task.getIexecTaskId();
            mockIexecService.setTaskCompleted(iexecTaskId, success);
            
            logger.info("🎭 Manually completed mock task: {} (success={})", taskId, success);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "taskId", taskId,
                "iexecTaskId", iexecTaskId,
                "completed", success,
                "message", "Task will be updated in next monitoring cycle (max 30s)"
            ));
            
        } catch (Exception e) {
            logger.error("Failed to complete mock task", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", e.getMessage()
            ));
        }
    }
    
    /**
     * 查看所有模拟任务
     */
    @GetMapping("/tasks")
    public ResponseEntity<?> getAllMockTasks() {
        if (!mockEnabled) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Mock mode is disabled"
            ));
        }
        
        return ResponseEntity.ok(mockIexecService.getAllMockTasks());
    }
    
    /**
     * 获取模拟模式状态
     */
    @GetMapping("/status")
    public ResponseEntity<?> getMockStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("mockEnabled", mockEnabled);
        status.put("mode", mockEnabled ? "MOCK" : "REAL");
        status.put("description", mockEnabled ? 
            "Using simulated iExec tasks (no real computation)" : 
            "Using real iExec network (requires RLC tokens)");
        
        if (mockEnabled) {
            status.put("endpoints", Map.of(
                "createTask", "POST /api/mock/tasks/create?userAddress=0x...",
                "completeTask", "POST /api/mock/tasks/{taskId}/complete",
                "listTasks", "GET /api/mock/tasks",
                "checkStatus", "GET /api/tasks/task-id/{taskId}"
            ));
        }
        
        return ResponseEntity.ok(status);
    }
    
    /**
     * 批量创建模拟任务（用于测试监控系统）
     */
    @PostMapping("/tasks/batch")
    public ResponseEntity<?> createBatchMockTasks(
            @RequestParam String userAddress,
            @RequestParam(required = false, defaultValue = "5") int count) {
        
        if (!mockEnabled) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Mock mode is disabled"
            ));
        }
        
        if (count > 20) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Maximum batch size is 20"
            ));
        }
        
        try {
            Map<String, String> createdTasks = new HashMap<>();
            
            for (int i = 0; i < count; i++) {
                String taskId = "task_batch_" + UUID.randomUUID().toString();
                String params = "echo 'Batch task " + (i + 1) + "'";
                String mockIexecTaskId = mockIexecService.createMockTask(userAddress, params);
                
                TaskEntity task = new TaskEntity();
                task.setTaskId(taskId);
                task.setIexecTaskId(mockIexecTaskId);
                task.setUserAddress(userAddress);
                task.setStatus("Running");
                task.setCreatedAt(LocalDateTime.now());
                task.setUpdatedAt(LocalDateTime.now());
                
                taskService.saveTask(task);
                createdTasks.put(taskId, mockIexecTaskId);
            }
            
            logger.info("✅ Created {} mock tasks in batch", count);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "count", count,
                "tasks", createdTasks,
                "message", "All tasks will complete in 30-120 seconds"
            ));
            
        } catch (Exception e) {
            logger.error("Failed to create batch tasks", e);
            return ResponseEntity.internalServerError().body(Map.of(
                "error", e.getMessage()
            ));
        }
    }
}
