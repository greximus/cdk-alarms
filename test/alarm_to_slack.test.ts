import * as unit from "../functions/alarm_to_slack";
import * as fs from "fs";
import * as https from "https";
import { RequestOptions, IncomingMessage, ClientRequest } from "http";
import { URL } from "url";
jest.mock("https");

test("CloudWatch Alarm to Slack", () => {
  const mockTaskChangeEvent = JSON.parse(
    fs.readFileSync("test_resources/cloudwatch_alarm.json", "utf8")
  );
  const mockContext = {};
  assertSlackMessageBody();

  const result = unit.handler(mockTaskChangeEvent, mockContext);
  expect(result).toBeTruthy();
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
