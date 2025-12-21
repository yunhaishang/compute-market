package com.blockchain.iExec.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;

@Configuration
public class Web3Config {
    
    @Bean
    public Web3j web3j() {
        // 使用 Infura 或其他 RPC 端点连接到区块链网络
        // 生产环境中应从配置文件中读取
        return Web3j.build(new HttpService("https://mainnet.infura.io/v3/YOUR_PROJECT_ID"));
    }
}