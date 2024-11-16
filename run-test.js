const fetch = require("node-fetch");

// Get environment variables
const FIXA_API_KEY = process.env.FIXA_API_KEY;
const AGENT_ID = process.env.AGENT_ID;
const SCENARIO_IDS = process.env.SCENARIO_IDS;
const TEST_AGENT_IDS = process.env.TEST_AGENT_IDS;
const TIME_LIMIT = process.env.TIME_LIMIT || 10;
const FIXA_BASE_URL = "https://www.fixa.dev";

// Validate required environment variables
if (!FIXA_API_KEY || !AGENT_ID) {
  console.error("missing required environment variables");
  process.exit(1);
}

function printTestUrl(testId) {
  console.log(
    `view test at: ${FIXA_BASE_URL}/dashboard/${AGENT_ID}/tests/${testId}`
  );
}

async function getTestStatus(testId) {
  const response = await fetch(`${FIXA_BASE_URL}/api/tests/${testId}/status`, {
    headers: {
      Authorization: `Bearer ${FIXA_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

function printCalls(calls) {
  calls.forEach((call) => {
    console.log(
      `- call_id: ${call.id}, status: ${call.status}, result: ${call.result}`
    );
  });
}

async function pollTestStatus(testId) {
  const startTime = Date.now();
  const TIMEOUT = TIME_LIMIT * 60 * 1000; // time limit in milliseconds

  while (true) {
    if (Date.now() - startTime > TIMEOUT) {
      console.log(`test timed out after ${TIME_LIMIT} minutes`);
      process.exit(1);
    }

    const status = await getTestStatus(testId);
    console.log(`current test status: ${status.data.status}`);

    if (status.data.calls) {
      printCalls(status.data.calls);
    }

    if (status.data.calls.some((call) => call.status === "failed")) {
      console.log("some tests failed!");
      printTestUrl(testId);
      process.exit(1);
    }

    if (status.data.status === "is_completed") {
      console.log("all tests passed!");
      printTestUrl(testId);
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
  }
}

async function runTest() {
  try {
    const body = {
      agentId: AGENT_ID,
    };
    if (SCENARIO_IDS) {
      body.scenarioIds = SCENARIO_IDS.split(",").map((id) => id.trim());
    }
    if (TEST_AGENT_IDS) {
      body.testAgentIds = TEST_AGENT_IDS.split(",").map((id) => id.trim());
    }
    const response = await fetch(`${FIXA_BASE_URL}/api/tests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIXA_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const testId = data.data.testId;
    console.log(`test run started with id: ${testId}`);
    printTestUrl(testId);

    // Add polling for test status
    await pollTestStatus(testId);
  } catch (error) {
    console.error("error running test:", error);
    process.exit(1);
  }
}

runTest();

/*
export FIXA_API_KEY=""
export AGENT_ID="your-agent-id"
export SCENARIO_IDS="id1,id2,id3"
export TEST_AGENT_IDS="test1,test2,test3"
*/
