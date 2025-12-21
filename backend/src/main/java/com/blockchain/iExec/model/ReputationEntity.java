package com.blockchain.iExec.model;

import jakarta.persistence.*;

@Entity
@Table(name = "reputation")
public class ReputationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String address;
    
    private Double completionRate = 1.0; // 任务完成率
    private Double onTimeRate = 1.0;    // 准时完成率
    private Double qualityScore = 1.0;  // 结果质量评分
    private Double finalScore = 1.0;    // 综合信誉分数
    
    private Integer totalTasks = 0;   // 总任务数
    private Integer completedTasks = 0; // 已完成任务数
    private Integer onTimeTasks = 0;    // 准时完成任务数
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    public Double getCompletionRate() {
        return completionRate;
    }
    
    public void setCompletionRate(Double completionRate) {
        this.completionRate = completionRate;
    }
    
    public Double getOnTimeRate() {
        return onTimeRate;
    }
    
    public void setOnTimeRate(Double onTimeRate) {
        this.onTimeRate = onTimeRate;
    }
    
    public Double getQualityScore() {
        return qualityScore;
    }
    
    public void setQualityScore(Double qualityScore) {
        this.qualityScore = qualityScore;
    }
    
    public Double getFinalScore() {
        return finalScore;
    }
    
    public void setFinalScore(Double finalScore) {
        this.finalScore = finalScore;
    }
    
    public Integer getTotalTasks() {
        return totalTasks;
    }
    
    public void setTotalTasks(Integer totalTasks) {
        this.totalTasks = totalTasks;
    }
    
    public Integer getCompletedTasks() {
        return completedTasks;
    }
    
    public void setCompletedTasks(Integer completedTasks) {
        this.completedTasks = completedTasks;
    }
    
    public Integer getOnTimeTasks() {
        return onTimeTasks;
    }
    
    public void setOnTimeTasks(Integer onTimeTasks) {
        this.onTimeTasks = onTimeTasks;
    }
}