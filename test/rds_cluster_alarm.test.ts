import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Stack, CfnElement, App, StackProps } from "@aws-cdk/core";
import {
  DatabaseCluster,
  DatabaseClusterEngine,
  DatabaseInstance,
  DatabaseInstanceEngine,
} from "@aws-cdk/aws-rds";
import {
  Vpc,
  InstanceType,
  InstanceSize,
  InstanceClass,
} from "@aws-cdk/aws-ec2";
import { DatabaseClusterAlarm } from "../lib/rds_cluster_alarm";

test("Should generate default alarms for RDS Cluster", () => {
  let stack = new Stack();

  let cluster = new DatabaseCluster(stack, "test-cluster", {
    engine: DatabaseClusterEngine.AURORA_MYSQL,
    masterUser: {
      username: "admin",
    },
    instanceProps: {
      vpc: new Vpc(stack, "test-vpc"),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    },
  });

  DatabaseClusterAlarm.createClusterAlarms(stack, cluster);

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "CPUUtilization",
    Threshold: 90,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "FreeableMemory",
    Threshold: 100 * 1024 * 1024,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "Deadlocks",
    Threshold: 1,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });
});

test("Should custom alarms for RDS Cluster", () => {
  let stack = new Stack();

  let cluster = new DatabaseCluster(stack, "test-cluster", {
    engine: DatabaseClusterEngine.AURORA_MYSQL,
    masterUser: {
      username: "admin",
    },
    instanceProps: {
      vpc: new Vpc(stack, "test-vpc"),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    },
  });

  DatabaseClusterAlarm.createClusterAlarms(stack, cluster, {
    highCpuPct: 80,
    highCpuEnabled: true,
    lowMemoryEnabled: false,
    deadLockEnabled: false,
    writeLatencyEnabled: false,
    readLatencyEnabled: false,
  });

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "CPUUtilization",
    Threshold: 80,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });

  expect(stack).not.toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "FreeableMemory",
    Threshold: 100 * 1024 * 1024,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });

  expect(stack).not.toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "Deadlocks",
    Threshold: 1,
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });
});

test("Should create no alarms for RDS Cluster", () => {
  let stack = new Stack();

  let cluster = new DatabaseCluster(stack, "test-cluster", {
    engine: DatabaseClusterEngine.AURORA_MYSQL,
    masterUser: {
      username: "admin",
    },
    instanceProps: {
      vpc: new Vpc(stack, "test-vpc"),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    },
  });

  DatabaseClusterAlarm.createClusterAlarms(stack, cluster, {
    highCpuEnabled: false,
    lowMemoryEnabled: false,
    deadLockEnabled: false,
    writeLatencyEnabled: false,
    readLatencyEnabled: false,
  });

  expect(stack).not.toHaveResourceLike("AWS::CloudWatch::Alarm", {});
});

test("Should generate event subscription for RDS Cluster", () => {
  let stack = new Stack();

  let cluster = new DatabaseCluster(stack, "test-cluster", {
    engine: DatabaseClusterEngine.AURORA_MYSQL,
    masterUser: {
      username: "admin",
    },
    instanceProps: {
      vpc: new Vpc(stack, "test-vpc"),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    },
  });

  DatabaseClusterAlarm.subcribeEventsToSlack(stack, "rds-events", cluster, {
    username: "Alarm Bot",
    url: "/slack/webhook",
    channel: "#alerts",
  });

  expect(stack).toHaveResourceLike("AWS::RDS::EventSubscription", {
    EventCategories: [
      "availability",
      "backup",
      "configuration change",
      "creation",
      "deletion",
      "failover",
      "failure",
      "low storage",
      "read replica",
      "recovery",
    ],
    SourceIds: [
      {
        Ref: stack.getLogicalId(cluster.node.defaultChild as CfnElement),
      },
    ],
  });
});

test("Should create deadlock alarm with default", () => {
  let stack = new Stack();

  let cluster = new DatabaseCluster(stack, "test-cluster", {
    engine: DatabaseClusterEngine.AURORA_MYSQL,
    masterUser: {
      username: "admin",
    },
    instanceProps: {
      vpc: new Vpc(stack, "test-vpc"),
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
    },
  });

  DatabaseClusterAlarm.createDeadlockAlarm(stack, cluster);

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "Deadlocks",
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });
});

class OuterCdkStack extends Stack {
  cluster: DatabaseCluster;

  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

    this.cluster = new DatabaseCluster(this, "test-cluster", {
      engine: DatabaseClusterEngine.AURORA_MYSQL,
      masterUser: {
        username: "admin",
      },
      instanceProps: {
        vpc: new Vpc(this, "test-vpc"),
        instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
      },
    });
  }
}

test("Should create alarms when cluster lives another stack via import", () => {
  let app = new App();
  let outerStack = new OuterCdkStack(app, "outer");

  let innerStack = new Stack(app, "inner");
  DatabaseClusterAlarm.createDeadlockAlarm(innerStack, outerStack.cluster);

  expect(innerStack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    MetricName: "Deadlocks",
    Namespace: "AWS/RDS",
    Period: 60,
    Statistic: "Average",
  });
});
