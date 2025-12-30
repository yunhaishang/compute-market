package com.blockchain.iExec.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.tx.gas.ContractGasProvider;

@Configuration
public class Web3Config {
    
    @Value("${web3j.client-address}")
    private String localNodeUrl;
    
    @Value("${arbitrum.sepolia.rpc-url}")
    private String arbitrumSepoliaUrl;
    
    @Value("${contract.address}")
    private String localContractAddress;
    
    @Value("${arbitrum.sepolia.contract-address:}")
    private String arbitrumContractAddress;
    
    /**
     * 本地链 Web3j 实例（Hardhat）
     * 用于监听任务创建事件和更新任务状态
     */
    @Bean(name = "localWeb3j")
    public Web3j localWeb3j() {
        return Web3j.build(new HttpService(localNodeUrl));
    }
    
    /**
     * Arbitrum Sepolia Web3j 实例
     * 用于提交任务到远程链进行计算
     */
    @Bean(name = "arbitrumWeb3j")
    public Web3j arbitrumWeb3j() {
        return Web3j.build(new HttpService(arbitrumSepoliaUrl));
    }
    
    /**
     * 默认 Gas 提供者
     */
    @Bean
    public ContractGasProvider gasProvider() {
        return new DefaultGasProvider();
    }
    
    /**
     * 本地合约地址
     */
    @Bean(name = "localContractAddress")
    public String getLocalContractAddress() {
        return localContractAddress;
    }
    
    /**
     * Arbitrum Sepolia 合约地址
     */
    @Bean(name = "arbitrumContractAddress")
    public String getArbitrumContractAddress() {
        return arbitrumContractAddress;
    }
}