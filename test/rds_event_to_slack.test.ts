import * as unit from "../functions/rds_event_to_slack/index";
import * as fs from "fs";
import * as https from "https";
import { RequestOptions, IncomingMessage, ClientRequest } from "http";
import { URL } from "url";
jest.mock("https");

test("RDS Instance State Event", () => {
  const mockTaskChangeEvent = JSON.parse(
    fs.readFileSync("test_resources/rds_instance_change_info.json", "utf8")
  );
  const mockContext = {};
  assertSlackMessageBody();

  const result = unit.handler(mockTaskChangeEvent, mockContext);
  expect(result).toEqual({
    dbInstanceIdentifier:
      "arn:aws:rds:us-east-1:123456789012:db:my-db-instance",
    message: "A Multi-AZ failover has completed.",
    eventType: "failover",
  });
});

test("RDS Cluster State Event", () => {
  const mockTaskChangeEvent = JSON.parse(
    fs.readFileSync("test_resources/rds_cluster_change_info.json", "utf8")
  );
  const mockContext = {};
  assertSlackMessageBody();

  const result = unit.handler(mockTaskChangeEvent, mockContext);
  expect(result).toEqual({
    dbInstanceIdentifier:
      "arn:aws:rds:us-east-1:123456789012:cluster:my-db-cluster",
    eventType: "notification",
    message: "Database cluster has been patched",
  });
});

function assertSlackMessageBody() {
  jest.spyOn(https, "request").mockImplementation(
    (
      url: string | URL,
      options: RequestOptions,
      callback?: (res: IncomingMessage) => void
    ): ClientRequest => {
      return <ClientRequest>{
        on: (kind: string, event: any): any => {
          if (kind == "error") {
            return "An error occurred";
          }
        },
        end: () => {},
        write: (body: any): void => {},
      };
    }
  );
}
