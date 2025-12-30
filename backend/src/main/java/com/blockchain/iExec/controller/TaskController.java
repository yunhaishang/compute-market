package com.blockchain.iExec.controller;

import com.blockchain.iExec.model.TaskEntity;
import com.blockchain.iExec.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/tasks")
public class TaskController {
    
    @Autowired
    private TaskService taskService;
    
    @GetMapping
    public ResponseEntity<List<TaskEntity>> getAllTasks() {
        List<TaskEntity> tasks = taskService.getAllTasks();
        return ResponseEntity.ok(tasks);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<TaskEntity> getTaskById(@PathVariable String id) {
        // 首先尝试作为区块链 taskId 查询（最常见的情况）
        TaskEntity task = taskService.getTaskByTaskId(id);
        if (task != null) {
            return ResponseEntity.ok(task);
        }
        
        // 如果没找到，尝试作为数据库 ID 查询
        try {
            Long dbId = Long.parseLong(id);
            Optional<TaskEntity> taskById = taskService.getTaskById(dbId);
            return taskById.map(ResponseEntity::ok)
                           .orElseGet(() -> ResponseEntity.notFound().build());
        } catch (NumberFormatException e) {
            // 如果不是有效的数字，返回 404
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/task-id/{taskId}")
    public ResponseEntity<TaskEntity> getTaskByTaskId(@PathVariable String taskId) {
        TaskEntity task = taskService.getTaskByTaskId(taskId);
        return task != null ? ResponseEntity.ok(task) : ResponseEntity.notFound().build();
    }
    
    @GetMapping("/iexec-task-id/{iexecTaskId}")
    public ResponseEntity<TaskEntity> getTaskByIexecTaskId(@PathVariable String iexecTaskId) {
        TaskEntity task = taskService.getTaskByIexecTaskId(iexecTaskId);
        return task != null ? ResponseEntity.ok(task) : ResponseEntity.notFound().build();
    }
    
    @PostMapping
    public ResponseEntity<TaskEntity> createTask(@RequestBody TaskEntity task) {
        TaskEntity savedTask = taskService.saveTask(task);
        return ResponseEntity.ok(savedTask);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<TaskEntity> updateTask(@PathVariable Long id, @RequestBody TaskEntity taskDetails) {
        Optional<TaskEntity> optionalTask = taskService.getTaskById(id);
        
        if (!optionalTask.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        TaskEntity existingTask = optionalTask.get();
        existingTask.setTaskId(taskDetails.getTaskId());
        existingTask.setIexecTaskId(taskDetails.getIexecTaskId());
        existingTask.setUserAddress(taskDetails.getUserAddress());
        existingTask.setStatus(taskDetails.getStatus());
        existingTask.setResultHash(taskDetails.getResultHash());
        
        TaskEntity updatedTask = taskService.saveTask(existingTask);
        return ResponseEntity.ok(updatedTask);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable Long id) {
        try {
            taskService.deleteTask(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/{id}/status")
    public ResponseEntity<TaskEntity> updateTaskStatus(@PathVariable Long id, @RequestParam String status) {
        Optional<TaskEntity> optionalTask = taskService.getTaskById(id);
        
        if (!optionalTask.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        TaskEntity task = optionalTask.get();
        task.setStatus(status);
        TaskEntity updatedTask = taskService.saveTask(task);
        
        return ResponseEntity.ok(updatedTask);
    }
}