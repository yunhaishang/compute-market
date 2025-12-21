package com.blockchain.iExec;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableScheduling
@EnableJpaRepositories(basePackages = "com.blockchain.iExec.repository")
public class IExecApplication {

	public static void main(String[] args) {
		SpringApplication.run(IExecApplication.class, args);
	}

}