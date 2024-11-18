// Get environment variables
const FIXA_API_KEY = process.env.FIXA_API_KEY;
const AGENT_ID = process.env.AGENT_ID;
const SCENARIO_IDS = process.env.SCENARIO_IDS;
const TEST_AGENT_IDS = process.env.TEST_AGENT_IDS;
const TIME_LIMIT = process.env.TIME_LIMIT
  ? parseInt(process.env.TIME_LIMIT)
  : 10;
const FIXA_BASE_URL = "https://www.fixa.dev";
const FIXA_API_BASE_URL = "https://www.fixa.dev/api/v1";
// const FIXA_API_BASE_URL = "http://localhost:3000/api/v1";

// Validate required environment variables
if (!FIXA_API_KEY || !AGENT_ID) {
  console.error("missing required environment variables");
  process.exit(1);
}

// Validate TIME_LIMIT is a positive number
if (isNaN(TIME_LIMIT) || TIME_LIMIT <= 0) {
  console.error("TIME_LIMIT must be a positive number");
  process.exit(1);
}

function printTestUrl(testId) {
  console.log(
    `[${new Date().toISOString()}] view test at: ${FIXA_BASE_URL}/dashboard/${AGENT_ID}/tests/${testId}`
  );
}

async function getTestStatus(testId) {
  const response = await fetch(`${FIXA_API_BASE_URL}/tests/${testId}/status`, {
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
      `[${new Date().toISOString()}] - call_id: ${call.id}, status: ${
        call.status
      }` + (call.status === "completed" ? `, result: ${call.result}` : "")
    );
  });
}

async function pollTestStatus(testId) {
  const startTime = Date.now();
  const TIMEOUT = TIME_LIMIT * 60 * 1000; // time limit in milliseconds

  while (true) {
    if (Date.now() - startTime > TIMEOUT) {
      console.error(
        `[${new Date().toISOString()}] test timed out after ${TIME_LIMIT} minutes`
      );
      process.exit(1);
    }

    const data = await getTestStatus(testId);
    console.log(
      `[${new Date().toISOString()}] current test status: ${data.status}`
    );

    if (data.calls) {
      printCalls(data.calls);
    }

    if (
      data.calls.some(
        (call) => call.status === "completed" && call.result === "failure"
      )
    ) {
      console.error(`[${new Date().toISOString()}] some tests failed!`);
      printTestUrl(testId);
      process.exit(1);
    }

    if (data.status === "completed") {
      console.log(`[${new Date().toISOString()}] test passed!`);
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
    const response = await fetch(`${FIXA_API_BASE_URL}/tests`, {
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

    const testId = data.testId;
    console.log(
      `[${new Date().toISOString()}] test run started with id: ${testId}`
    );
    printTestUrl(testId);

    // Add polling for test status
    await pollTestStatus(testId);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] error running test:`, error);
    process.exit(1);
  }
}

runTest();
