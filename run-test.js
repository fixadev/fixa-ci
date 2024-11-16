const fetch = require("node-fetch");

// Get environment variables
const FIXA_API_KEY = process.env.FIXA_API_KEY;
const AGENT_ID = process.env.AGENT_ID;
const SCENARIO_IDS = process.env.SCENARIO_IDS;
const TEST_AGENT_IDS = process.env.TEST_AGENT_IDS;

// Validate required environment variables
if (!FIXA_API_KEY || !AGENT_ID || !SCENARIO_IDS || !TEST_AGENT_IDS) {
  console.error("Missing required environment variables");
  process.exit(1);
}

async function runTest() {
  try {
    const response = await fetch("https://www.fixa.dev/api/run-test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FIXA_API_KEY}`,
      },
      body: JSON.stringify({
        agentId: AGENT_ID,
        scenarioIds: SCENARIO_IDS.split(",").map((id) => id.trim()),
        testAgentIds: TEST_AGENT_IDS.split(",").map((id) => id.trim()),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Test run response:", data);
  } catch (error) {
    console.error("Error running test:", error);
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
