package com.blockchain.iExec.service;

import com.blockchain.iExec.model.TaskEntity;
import com.blockchain.iExec.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TaskService {
    
    @Autowired
    private TaskRepository taskRepository;
    
    public List<TaskEntity> getAllTasks() {
        return taskRepository.findAll();
    }
    
    public Optional<TaskEntity> getTaskById(Long id) {
        return taskRepository.findById(id);
    }
    
    public TaskEntity getTaskByTaskId(String taskId) {
        return taskRepository.findByTaskId(taskId);
    }
    
    public TaskEntity getTaskByIexecTaskId(String iexecTaskId) {
        return taskRepository.findByIexecTaskId(iexecTaskId);
    }
    
    public TaskEntity saveTask(TaskEntity task) {
        if (task.getCreatedAt() == null) {
            task.setCreatedAt(LocalDateTime.now());
        }
        task.setUpdatedAt(LocalDateTime.now());
        return taskRepository.save(task);
    }
    
    public void updateTaskStatus(String taskId, String status) {
        TaskEntity task = getTaskByTaskId(taskId);
        if (task != null) {
            task.setStatus(status);
            task.setUpdatedAt(LocalDateTime.now());
            if ("Completed".equals(status)) {
                task.setCompletedAt(LocalDateTime.now());
            }
            taskRepository.save(task);
        }
    }
    
    public void updateTaskResult(String taskId, String resultHash) {
        TaskEntity task = getTaskByTaskId(taskId);
        if (task != null) {
            task.setResultHash(resultHash);
            task.setStatus("Completed");
            task.setCompletedAt(LocalDateTime.now());
            task.setUpdatedAt(LocalDateTime.now());
            taskRepository.save(task);
        }
    }
    
    public void updateTaskErrorMessage(String taskId, String errorMessage) {
        TaskEntity task = getTaskByTaskId(taskId);
        if (task != null) {
            task.setErrorMessage(errorMessage);
            task.setStatus("Failed");
            task.setUpdatedAt(LocalDateTime.now());
            taskRepository.save(task);
        }
    }
    
    public void deleteTask(Long id) {
        taskRepository.deleteById(id);
    }
}