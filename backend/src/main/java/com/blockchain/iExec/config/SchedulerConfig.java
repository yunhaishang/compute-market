package com.blockchain.iExec.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulerConfig {
    // 启用 Spring 的任务调度功能
    // TaskMonitorService 将使用 @Scheduled 注解来定时轮询 iExec 网络
}