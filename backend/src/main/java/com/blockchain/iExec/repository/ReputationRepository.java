package com.blockchain.iExec.repository;

import com.blockchain.iExec.model.ReputationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReputationRepository extends JpaRepository<ReputationEntity, Long> {
    ReputationEntity findByAddress(String address);
}