package com.blockchain.iExec.service;

import com.blockchain.iExec.model.ReputationEntity;
import com.blockchain.iExec.repository.ReputationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReputationService {
    
    @Autowired
    private ReputationRepository reputationRepository;
    
    // 更新用户信誉
    public ReputationEntity updateReputation(String userAddress, boolean taskCompleted, boolean completedOnTime, double qualityScore) {
        ReputationEntity reputation = reputationRepository.findByAddress(userAddress);
        
        if (reputation == null) {
            reputation = new ReputationEntity();
            reputation.setAddress(userAddress);
        }
        
        // 更新任务统计
        reputation.setTotalTasks(reputation.getTotalTasks() + 1);
        
        if (taskCompleted) {
            reputation.setCompletedTasks(reputation.getCompletedTasks() + 1);
        }
        
        if (completedOnTime) {
            reputation.setOnTimeTasks(reputation.getOnTimeTasks() + 1);
        }
        
        // 计算各维度评分
        reputation.setCompletionRate((double) reputation.getCompletedTasks() / reputation.getTotalTasks());
        reputation.setOnTimeRate((double) reputation.getOnTimeTasks() / reputation.getTotalTasks());
        reputation.setQualityScore(qualityScore);
        
        // 使用自定义算法计算综合信誉分数
        calculateFinalScore(reputation);
        
        return reputationRepository.save(reputation);
    }
    
    // 计算综合信誉分数的核心算法
    private void calculateFinalScore(ReputationEntity reputation) {
        // 使用加权平均算法，各维度权重可以根据实际需求调整
        double completionWeight = 0.4;
        double onTimeWeight = 0.3;
        double qualityWeight = 0.3;
        
        double finalScore = (reputation.getCompletionRate() * completionWeight) +
                           (reputation.getOnTimeRate() * onTimeWeight) +
                           (reputation.getQualityScore() * qualityWeight);
        
        reputation.setFinalScore(finalScore);
    }
    
    // 获取所有用户的信誉
    public List<ReputationEntity> getAllReputations() {
        return reputationRepository.findAll();
    }
    
    // 根据用户地址获取信誉
    public ReputationEntity getReputationByAddress(String address) {
        return reputationRepository.findByAddress(address);
    }
}