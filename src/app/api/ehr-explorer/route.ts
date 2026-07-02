import { NextRequest, NextResponse } from "next/server";

const EHRBASE_URL = "base.tibbna.com";
const EHRBASE_USER = "auto-speed-ranting";
const EHRBASE_PASSWORD = "KivLWsQgN4f8aiHAvwuq";
const EHRBASE_API_KEY = "BgMxGMZk5isfCWezE5CF";

const auth = Buffer.from(`${EHRBASE_USER}:${EHRBASE_PASSWORD}`).toString("base64");

async function postAQL(query: string) {
  const response = await fetch(`https://${EHRBASE_URL}/ehrbase/rest/openehr/v1/query/aql`, {
    method: "POST",
    headers: {
      "X-API-Key": EHRBASE_API_KEY,
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EHRbase error: ${response.status} - ${error.substring(0, 200)}`);
  }

  return response.json();
}

async function fetchAPI(endpoint: string) {
  const response = await fetch(`https://${EHRBASE_URL}${endpoint}`, {
    headers: {
      "X-API-Key": EHRBASE_API_KEY,
      "Authorization": `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EHRbase error: ${response.status} - ${error.substring(0, 200)}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint") || "/summary";

  try {
    switch (endpoint) {
      case "/summary": {
        const ehrs = await postAQL("SELECT COUNT(e) FROM EHR e");
        const compositions = await postAQL("SELECT COUNT(c) FROM EHR e CONTAINS COMPOSITION c");
        const templates = await fetchAPI("/ehrbase/rest/openehr/v1/definition/template/adl1.4");

        return NextResponse.json({
          totalPatients: ehrs.rows?.[0]?.[0] || 0,
          totalCompositions: compositions.rows?.[0]?.[0] || 0,
          totalTemplates: Array.isArray(templates) ? templates.length : 0,
          templates: Array.isArray(templates) ? templates.map((t: any) => t.template_id) : [],
        });
      }

      case "/patients": {
        const ehrs = await postAQL(
          "SELECT e/ehr_id/value, e/ehr_status/subject/external_ref/id/value FROM EHR e ORDER BY e/ehr_id/value"
        );
        return NextResponse.json({
          patients: ehrs.rows?.map((row: any) => ({
            ehrId: row[0],
            subjectId: row[1],
          })) || [],
        });
      }

      case "/compositions": {
        const compositions = await postAQL(
          `SELECT c/archetype_details/template_id/value, c/uid/value, c/context/start_time/value, c/composer/name, e/ehr_id/value
           FROM EHR e CONTAINS COMPOSITION c
           ORDER BY c/context/start_time/value DESC
           LIMIT 100`
        );
        return NextResponse.json({
          compositions: compositions.rows?.map((row: any) => ({
            template: row[0],
            uid: row[1],
            date: row[2],
            composer: row[3],
            ehrId: row[4],
          })) || [],
        });
      }

      case "/procedures": {
        const procedures = await postAQL(
          `SELECT e/ehr_id/value, c/uid/value, c/context/start_time/value, c/composer/name,
           d/items[at0001]/value/value as service_name,
           d/narrative/value as narrative
           FROM EHR e CONTAINS COMPOSITION c CONTAINS INSTRUCTION d[openEHR-EHR-INSTRUCTION.service_request.v1]
           ORDER BY c/context/start_time/value DESC LIMIT 50`
        );
        return NextResponse.json({
          procedures: procedures.rows?.map((row: any) => ({
            ehrId: row[0],
            uid: row[1],
            date: row[2],
            composer: row[3],
            serviceName: row[4],
            narrative: row[5],
          })) || [],
        });
      }

      case "/price": {
        const compositions = await postAQL(
          `SELECT e/ehr_id/value, c/uid/value, c/context/start_time/value, c/composer/name,
           d/narrative/value as narrative
           FROM EHR e CONTAINS COMPOSITION c CONTAINS INSTRUCTION d[openEHR-EHR-INSTRUCTION.service_request.v1]
           WHERE d/narrative/value MATCHES '.*Price.*'
           ORDER BY c/context/start_time/value DESC LIMIT 50`
        );
        return NextResponse.json({
          compositions: compositions.rows?.map((row: any) => ({
            ehrId: row[0],
            uid: row[1],
            date: row[2],
            composer: row[3],
            narrative: row[4],
          })) || [],
        });
      }

      default: {
        if (endpoint.startsWith("/patient/")) {
          const ehrId = endpoint.split("/patient/")[1];
          const compositions = await postAQL(
            `SELECT c/archetype_details/template_id/value, c/uid/value, c/context/start_time/value, c/composer/name
             FROM EHR e[ehr_id/value='${ehrId}'] CONTAINS COMPOSITION c
             ORDER BY c/context/start_time/value DESC`
          );
          return NextResponse.json({
            ehrId,
            compositions: compositions.rows?.map((row: any) => ({
              template: row[0],
              uid: row[1],
              date: row[2],
              composer: row[3],
            })) || [],
          });
        }
        return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.ehrId && body.compositionUid) {
      const composition = await fetchAPI(
        `/ehrbase/rest/openehr/v1/ehr/${body.ehrId}/composition/${body.compositionUid}?format=FLAT`
      );
      return NextResponse.json(composition);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
