import { NextRequest, NextResponse } from "next/server";
import { createOpenEHRComposition } from "@/lib/openehr/openehr";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId,
      reportType,
      insuranceCompany,
      diagnosis,
      clinicalFindings,
      treatmentPlan,
      medications,
      investigations,
      prognosis,
      workStatus,
      recommendations,
    } = body;

    if (!patientId || !reportType || !insuranceCompany || !diagnosis) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Build the OpenEHR composition for Insurance Clinical Report in FLAT format
    const compositionData = {
      "_type": "COMPOSITION",
      "name": {
        "_type": "DV_TEXT",
        "value": "Insurance Clinical Report"
      },
      "archetype_details": {
        "_type": "ARCHETYPED",
        "archetype_id": {
          "_type": "ARCHETYPE_ID",
          "value": "openEHR-EHR-COMPOSITION.report.v1"
        },
        "template_id": {
          "_type": "TEMPLATE_ID",
          "value": "Insurance_Clinical_Report.v1"
        },
        "rm_version": "1.0.4"
      },
      "language": {
        "_type": "CODE_PHRASE",
        "terminology_id": {
          "_type": "TERMINOLOGY_ID",
          "value": "ISO_639-1"
        },
        "code_string": "en"
      },
      "territory": {
        "_type": "CODE_PHRASE",
        "terminology_id": {
          "_type": "TERMINOLOGY_ID",
          "value": "ISO_3166-1"
        },
        "code_string": "IQ"
      },
      "category": {
        "_type": "DV_CODED_TEXT",
        "value": "event",
        "defining_code": {
          "_type": "CODE_PHRASE",
          "terminology_id": {
            "_type": "TERMINOLOGY_ID",
            "value": "openehr"
          },
          "code_string": "433"
        }
      },
      "composer": {
        "_type": "PARTY_IDENTIFIED",
        "name": "System"
      },
      "context": {
        "_type": "EVENT_CONTEXT",
        "start_time": {
          "_type": "DV_DATE_TIME",
          "value": new Date().toISOString()
        },
        "setting": {
          "_type": "DV_CODED_TEXT",
          "value": "other care",
          "defining_code": {
            "_type": "CODE_PHRASE",
            "terminology_id": {
              "_type": "TERMINOLOGY_ID",
              "value": "openehr"
            },
            "code_string": "238"
          }
        },
        "other_context": {
          "_type": "ITEM_TREE",
          "name": {
            "_type": "DV_TEXT",
            "value": "Tree"
          },
          "items": [
            {
              "_type": "ELEMENT",
              "name": {
                "_type": "DV_TEXT",
                "value": "Report Type"
              },
              "value": {
                "_type": "DV_TEXT",
                "value": reportType
              }
            },
            {
              "_type": "ELEMENT",
              "name": {
                "_type": "DV_TEXT",
                "value": "Insurance Company"
              },
              "value": {
                "_type": "DV_TEXT",
                "value": insuranceCompany
              }
            }
          ]
        }
      },
      "content": [
        {
          "_type": "SECTION",
          "name": {
            "_type": "DV_TEXT",
            "value": "Clinical Information"
          },
          "items": [
            {
              "_type": "EVALUATION",
              "name": {
                "_type": "DV_TEXT",
                "value": "Problem/Diagnosis"
              },
              "archetype_node_id": "openEHR-EHR-EVALUATION.problem_diagnosis.v1",
              "data": {
                "_type": "ITEM_TREE",
                "name": {
                  "_type": "DV_TEXT",
                  "value": "structure"
                },
                "items": [
                  {
                    "_type": "ELEMENT",
                    "name": {
                      "_type": "DV_TEXT",
                      "value": "Problem/Diagnosis name"
                    },
                    "value": {
                      "_type": "DV_TEXT",
                      "value": diagnosis
                    }
                  },
                  ...(clinicalFindings ? [{
                    "_type": "ELEMENT",
                    "name": {
                      "_type": "DV_TEXT",
                      "value": "Clinical description"
                    },
                    "value": {
                      "_type": "DV_TEXT",
                      "value": clinicalFindings
                    }
                  }] : [])
                ]
              }
            },
            ...(investigations ? [{
              "_type": "OBSERVATION",
              "name": {
                "_type": "DV_TEXT",
                "value": "Investigations"
              },
              "archetype_node_id": "openEHR-EHR-OBSERVATION.story.v1",
              "data": {
                "_type": "HISTORY",
                "name": {
                  "_type": "DV_TEXT",
                  "value": "Story"
                },
                "origin": {
                  "_type": "DV_DATE_TIME",
                  "value": new Date().toISOString()
                },
                "events": [{
                  "_type": "POINT_EVENT",
                  "name": {
                    "_type": "DV_TEXT",
                    "value": "Any event"
                  },
                  "time": {
                    "_type": "DV_DATE_TIME",
                    "value": new Date().toISOString()
                  },
                  "data": {
                    "_type": "ITEM_TREE",
                    "name": {
                      "_type": "DV_TEXT",
                      "value": "Tree"
                    },
                    "items": [{
                      "_type": "ELEMENT",
                      "name": {
                        "_type": "DV_TEXT",
                        "value": "Story"
                      },
                      "value": {
                        "_type": "DV_TEXT",
                        "value": investigations
                      }
                    }]
                  }
                }]
              }
            }] : []),
            ...(medications ? [{
              "_type": "INSTRUCTION",
              "name": {
                "_type": "DV_TEXT",
                "value": "Medication Summary"
              },
              "archetype_node_id": "openEHR-EHR-INSTRUCTION.medication_order.v3",
              "narrative": {
                "_type": "DV_TEXT",
                "value": medications
              }
            }] : []),
            ...(treatmentPlan ? [{
              "_type": "EVALUATION",
              "name": {
                "_type": "DV_TEXT",
                "value": "Treatment Plan"
              },
              "archetype_node_id": "openEHR-EHR-EVALUATION.clinical_synopsis.v1",
              "data": {
                "_type": "ITEM_TREE",
                "name": {
                  "_type": "DV_TEXT",
                  "value": "Tree"
                },
                "items": [{
                  "_type": "ELEMENT",
                  "name": {
                    "_type": "DV_TEXT",
                    "value": "Synopsis"
                  },
                  "value": {
                    "_type": "DV_TEXT",
                    "value": treatmentPlan
                  }
                }]
              }
            }] : [])
          ]
        },
        {
          "_type": "SECTION",
          "name": {
            "_type": "DV_TEXT",
            "value": "Assessment & Recommendations"
          },
          "items": [
            ...(prognosis ? [{
              "_type": "EVALUATION",
              "name": {
                "_type": "DV_TEXT",
                "value": "Prognosis"
              },
              "archetype_node_id": "openEHR-EHR-EVALUATION.clinical_synopsis.v1",
              "data": {
                "_type": "ITEM_TREE",
                "name": {
                  "_type": "DV_TEXT",
                  "value": "Tree"
                },
                "items": [{
                  "_type": "ELEMENT",
                  "name": {
                    "_type": "DV_TEXT",
                    "value": "Synopsis"
                  },
                  "value": {
                    "_type": "DV_TEXT",
                    "value": `Prognosis: ${prognosis}`
                  }
                }]
              }
            }] : []),
            ...(workStatus ? [{
              "_type": "EVALUATION",
              "name": {
                "_type": "DV_TEXT",
                "value": "Work Status"
              },
              "archetype_node_id": "openEHR-EHR-EVALUATION.clinical_synopsis.v1",
              "data": {
                "_type": "ITEM_TREE",
                "name": {
                  "_type": "DV_TEXT",
                  "value": "Tree"
                },
                "items": [{
                  "_type": "ELEMENT",
                  "name": {
                    "_type": "DV_TEXT",
                    "value": "Synopsis"
                  },
                  "value": {
                    "_type": "DV_TEXT",
                    "value": `Work Status: ${workStatus}`
                  }
                }]
              }
            }] : []),
            ...(recommendations ? [{
              "_type": "EVALUATION",
              "name": {
                "_type": "DV_TEXT",
                "value": "Recommendations"
              },
              "archetype_node_id": "openEHR-EHR-EVALUATION.recommendation.v2",
              "data": {
                "_type": "ITEM_TREE",
                "name": {
                  "_type": "DV_TEXT",
                  "value": "Tree"
                },
                "items": [{
                  "_type": "ELEMENT",
                  "name": {
                    "_type": "DV_TEXT",
                    "value": "Recommendation"
                  },
                  "value": {
                    "_type": "DV_TEXT",
                    "value": recommendations
                  }
                }]
              }
            }] : [])
          ]
        }
      ]
    };

    // Create the composition in OpenEHR
    const result = await createOpenEHRComposition(patientId, "Insurance_Clinical_Report.v1", compositionData as Record<string, unknown>);

    return NextResponse.json({
      success: true,
      compositionId: result,
      message: "Insurance report created successfully"
    });

  } catch (error) {
    console.error("[Insurance Report API] Error:", error);
    return NextResponse.json(
      { error: "Failed to create insurance report" },
      { status: 500 }
    );
  }
}
