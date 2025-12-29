// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title ComputeMarket
 * @notice 算力交易市场合约 - 负责资金托管、任务状态管理和事件触发
 * @dev Gas 优化版本 - 使用自定义错误、结构体打包、存储缓存等技术
 */
contract ComputeMarket {
    // ============ 自定义错误 ============
    // 使用自定义错误替代 require 字符串，节省 Gas
    
    error NotAdmin();
    error ServiceNotActive();
    error TaskNotExists();
    error InsufficientPayment();
    error InvalidTaskStatus();
    error InvalidAddress();
    error InvalidPrice();
    error ServiceAlreadyExists();
    error TransferFailed();
    
    // ============ 状态变量 ============
    
    /// @notice 任务状态枚举
    enum TaskStatus {
        Created,    // 已创建
        Running,    // 运行中
        Completed,  // 已完成
        Refunded    // 已退款
    }
    
    /// @notice 任务信息结构体（Gas 优化：打包布局）
    struct Task {
        uint128 taskId;           // 任务ID（128位足够，节省 Gas）
        uint128 serviceId;         // 服务ID（128位足够）
        address buyer;            // 购买者地址（160位）
        uint96 amount;            // 支付金额（96位，最大约 79 ETH，足够）
        TaskStatus status;         // 任务状态（8位）
        uint32 createdAt;         // 创建时间戳（32位，到2106年）
        uint32 completedAt;       // 完成时间戳（32位）
        // 注意：resultHash 单独存储，因为 string 类型无法打包
    }
    
    /// @notice 服务信息结构体（Gas 优化：打包布局）
    struct Service {
        uint128 serviceId;         // 服务ID
        uint128 price;             // 价格（128位足够）
        bool active;               // 是否激活（8位，但占用一个槽位）
    }
    
    address public admin;          // 管理员地址
    uint256 private _taskCounter;   // 任务计数器
    
    mapping(uint256 => Task) public tasks;           // taskId => Task
    mapping(uint256 => string) private taskResultHashes;  // taskId => resultHash（分离存储）
    mapping(uint256 => Service) public services;    // serviceId => Service
    
    // ============ 事件 ============
    
    /// @notice 任务创建事件
    event TaskCreated(
        uint256 indexed taskId,
        uint256 indexed serviceId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );
    
    /// @notice 任务完成事件
    event TaskCompleted(
        uint256 indexed taskId,
        uint256 indexed serviceId,
        address indexed buyer,
        string resultHash,
        uint256 timestamp
    );
    
    /// @notice 任务退款事件
    event TaskRefunded(
        uint256 indexed taskId,
        uint256 indexed serviceId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );
    
    /// @notice 服务注册事件
    event ServiceRegistered(
        uint256 indexed serviceId,
        uint256 price,
        address indexed registrant
    );
    
    // ============ 修饰符 ============
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }
    
    modifier validService(uint256 serviceId) {
        if (!services[serviceId].active) revert ServiceNotActive();
        _;
    }
    
    modifier validTask(uint256 taskId) {
        if (tasks[taskId].taskId == 0) revert TaskNotExists();
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor() {
        admin = msg.sender;
    }
    
    // ============ 核心功能 ============
    
    /**
     * @notice 购买算力服务
     * @param serviceId 服务ID
     */
    function buyCompute(uint256 serviceId) 
        external 
        payable 
        validService(serviceId)
    {
        // Gas 优化：缓存存储变量到内存
        Service memory service = services[serviceId];
        
        // 校验支付金额（使用自定义错误）
        if (msg.value < service.price) revert InsufficientPayment();
        
        // Gas 优化：使用 unchecked 块（计数器递增是安全的）
        uint256 taskId;
        unchecked {
            _taskCounter++;
            taskId = _taskCounter;
        }
        
        // Gas 优化：直接写入存储，避免创建临时结构体
        // 注意：使用类型转换以匹配优化后的结构体布局
        tasks[taskId] = Task({
            taskId: uint128(taskId),
            serviceId: uint128(serviceId),
            buyer: msg.sender,
            amount: uint96(msg.value),  // 假设金额不超过 79 ETH
            status: TaskStatus.Created,
            createdAt: uint32(block.timestamp),
            completedAt: 0
        });
        
        // 发出事件
        emit TaskCreated(
            taskId,
            serviceId,
            msg.sender,
            msg.value,
            block.timestamp
        );
    }
    
    /**
     * @notice 管理员标记任务为运行中
     * @param taskId 任务ID
     */
    function startTask(uint256 taskId) 
        external 
        onlyAdmin 
        validTask(taskId)
    {
        Task storage task = tasks[taskId];
        if (task.status != TaskStatus.Created) revert InvalidTaskStatus();
        
        task.status = TaskStatus.Running;
    }
    
    /**
     * @notice 管理员完成任务并释放资金
     * @param taskId 任务ID
     * @param resultHash 计算结果哈希
     */
    function completeTask(uint256 taskId, string calldata resultHash) 
        external 
        onlyAdmin 
        validTask(taskId)
    {
        Task storage task = tasks[taskId];
        TaskStatus currentStatus = task.status;
        
        // Gas 优化：提前检查状态，避免不必要的存储读取
        if (currentStatus != TaskStatus.Running && currentStatus != TaskStatus.Created) {
            revert InvalidTaskStatus();
        }
        
        // Gas 优化：缓存金额到内存，避免多次存储读取
        uint96 amount = task.amount;
        
        // 更新状态
        task.status = TaskStatus.Completed;
        task.completedAt = uint32(block.timestamp);
        
        // 存储结果哈希（分离存储以优化结构体打包）
        taskResultHashes[taskId] = resultHash;
        
        // 释放资金给服务提供者（这里简化处理，直接转给管理员）
        // 实际场景中，应该转给服务提供者地址
        (bool success, ) = admin.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        // 发出事件
        emit TaskCompleted(
            taskId,
            task.serviceId,
            task.buyer,
            resultHash,
            block.timestamp
        );
    }
    
    /**
     * @notice 管理员退款任务
     * @param taskId 任务ID
     */
    function refundTask(uint256 taskId) 
        external 
        onlyAdmin 
        validTask(taskId)
    {
        Task storage task = tasks[taskId];
        TaskStatus currentStatus = task.status;
        
        // Gas 优化：提前检查状态
        if (currentStatus != TaskStatus.Created && currentStatus != TaskStatus.Running) {
            revert InvalidTaskStatus();
        }
        
        // Gas 优化：缓存变量到内存
        uint96 amount = task.amount;
        address buyer = task.buyer;
        uint128 serviceId = task.serviceId;
        
        // 更新状态
        task.status = TaskStatus.Refunded;
        
        // 退款给购买者
        (bool success, ) = buyer.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        // 发出事件
        emit TaskRefunded(
            taskId,
            serviceId,
            buyer,
            amount,
            block.timestamp
        );
    }
    
    // ============ 管理员功能 ============
    
    /**
     * @notice 注册服务
     * @param serviceId 服务ID
     * @param price 价格（wei）
     */
    function registerService(uint256 serviceId, uint256 price) 
        external 
        onlyAdmin 
    {
        if (price == 0) revert InvalidPrice();
        if (services[serviceId].active) revert ServiceAlreadyExists();
        
        services[serviceId] = Service({
            serviceId: uint128(serviceId),
            price: uint128(price),
            active: true
        });
        
        emit ServiceRegistered(serviceId, price, msg.sender);
    }
    
    /**
     * @notice 更新服务价格
     * @param serviceId 服务ID
     * @param newPrice 新价格（wei）
     */
    function updateServicePrice(uint256 serviceId, uint256 newPrice) 
        external 
        onlyAdmin 
        validService(serviceId)
    {
        if (newPrice == 0) revert InvalidPrice();
        services[serviceId].price = uint128(newPrice);
    }
    
    /**
     * @notice 停用服务
     * @param serviceId 服务ID
     */
    function deactivateService(uint256 serviceId) 
        external 
        onlyAdmin 
        validService(serviceId)
    {
        services[serviceId].active = false;
    }
    
    /**
     * @notice 转移管理员权限
     * @param newAdmin 新管理员地址
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert InvalidAddress();
        admin = newAdmin;
    }
    
    // ============ 查询功能 ============
    
    /**
     * @notice 获取任务信息
     * @param taskId 任务ID
     * @return task 任务信息（不包含 resultHash）
     * @return resultHash 结果哈希
     */
    function getTask(uint256 taskId) external view returns (Task memory task, string memory resultHash) {
        task = tasks[taskId];
        resultHash = taskResultHashes[taskId];
    }
    
    /**
     * @notice 获取任务结果哈希
     * @param taskId 任务ID
     * @return string 结果哈希
     */
    function getTaskResultHash(uint256 taskId) external view returns (string memory) {
        return taskResultHashes[taskId];
    }
    
    /**
     * @notice 获取服务信息
     * @param serviceId 服务ID
     * @return Service 服务信息
     */
    function getService(uint256 serviceId) external view returns (Service memory) {
        return services[serviceId];
    }
    
    /**
     * @notice 获取任务总数
     * @return uint256 任务总数
     */
    function getTaskCount() external view returns (uint256) {
        return _taskCounter;
    }
    
    /**
     * @notice 获取合约余额
     * @return uint256 合约余额（wei）
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

