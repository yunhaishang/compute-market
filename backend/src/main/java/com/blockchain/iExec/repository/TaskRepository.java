package com.blockchain.iExec.repository;

import com.blockchain.iExec.model.TaskEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TaskRepository extends JpaRepository<TaskEntity, Long> {
    TaskEntity findByTaskId(String taskId);
    TaskEntity findByIexecTaskId(String iexecTaskId);
}