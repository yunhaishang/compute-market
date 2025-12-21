package com.blockchain.iExec.contract;

import org.springframework.stereotype.Component;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.RemoteCall;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.Contract;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.Utf8String;

import java.math.BigInteger;
import java.util.Collections;
import java.util.List;

@Component
public class ComputeMarketContract extends Contract {
    
    // 智能合约 ABI
    private static final String CONTRACT_ABI = "[\n" +
        "  {\n" +
        "    \"anonymous\": false,\n" +
        "    \"inputs\": [\n" +
        "      {\n" +
        "        \"indexed\": true,\n" +
        "        \"name\": \"taskId\",\n" +
        "        \"type\": \"uint256\"\n" +
        "      },\n" +
        "      {\n" +
        "        \"indexed\": true,\n" +
        "        \"name\": \"user\",\n" +
        "        \"type\": \"address\"\n" +
        "      },\n" +
        "      {\n" +
        "        \"indexed\": false,\n" +
        "        \"name\": \"serviceId\",\n" +
        "        \"type\": \"uint256\"\n" +
        "      },\n" +
        "      {\n" +
        "        \"indexed\": false,\n" +
        "        \"name\": \"amount\",\n" +
        "        \"type\": \"uint256\"\n" +
        "      }\n" +
        "    ],\n" +
        "    \"name\": \"TaskCreated\",\n" +
        "    \"type\": \"event\"\n" +
        "  },\n" +
        "  {\n" +
        "    \"constant\": false,\n" +
        "    \"inputs\": [\n" +
        "      {\n" +
        "        \"name\": \"taskId\",\n" +
        "        \"type\": \"uint256\"\n" +
        "      },\n" +
        "      {\n" +
        "        \"name\": \"resultHash\",\n" +
        "        \"type\": \"string\"\n" +
        "      }\n" +
        "    ],\n" +
        "    \"name\": \"completeTask\",\n" +
        "    \"outputs\": [],\n" +
        "    \"payable\": false,\n" +
        "    \"stateMutability\": \"nonpayable\",\n" +
        "    \"type\": \"function\"\n" +
        "  }\n" +
        "]";
    
    // 智能合约字节码（用于部署）
    private static final String CONTRACT_BIN = "YOUR_CONTRACT_BYTECODE";
    
    protected ComputeMarketContract(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider gasProvider) {
        super(CONTRACT_ABI, contractAddress, web3j, transactionManager, gasProvider);
    }
    
    public static RemoteCall<ComputeMarketContract> deploy(Web3j web3j, TransactionManager transactionManager, ContractGasProvider gasProvider) {
        return deployRemoteCall(ComputeMarketContract.class, web3j, transactionManager, gasProvider, CONTRACT_BIN, "");
    }
    
    public static ComputeMarketContract load(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider gasProvider) {
        return new ComputeMarketContract(contractAddress, web3j, transactionManager, gasProvider);
    }
    
    public RemoteCall<TransactionReceipt> completeTask(BigInteger taskId, String resultHash) {
        // 调用合约的 completeTask 函数
        Function function = new Function(
            "completeTask",
            List.of(new Uint256(taskId), new Utf8String(resultHash)),
            Collections.emptyList()
        );
        return executeRemoteCallTransaction(function);
    }
    
    // 定义 TaskCreated 事件类
    public static class TaskCreatedEventResponse {
        public BigInteger taskId;
        public String user;
        public BigInteger serviceId;
        public BigInteger amount;
    }
}