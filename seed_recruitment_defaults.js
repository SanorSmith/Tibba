const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function seedRecruitmentDefaults() {
  console.log('🌱 Seeding default recruitment data...\n');
  
  const client = await pool.connect();
  try {
    // Get all workspaces
    const wsResult = await client.query('SELECT workspaceid FROM workspaces');
    const workspaces = wsResult.rows;
    console.log(`Found ${workspaces.length} workspaces\n`);

    const defaultStages = [
      { name: 'Applied', order: 1, type: 'SCREENING', description: 'Initial application received', targetDays: 2 },
      { name: 'Screening', order: 2, type: 'SCREENING', description: 'Resume and qualification review', targetDays: 2 },
      { name: 'Phone Screen', order: 3, type: 'PHONE_SCREEN', description: 'Initial phone interview', targetDays: 5 },
      { name: 'Assessment', order: 4, type: 'ASSESSMENT', description: 'Skills or technical assessment', targetDays: 7 },
      { name: 'Technical Interview', order: 5, type: 'TECHNICAL_INTERVIEW', description: 'Technical skills interview', targetDays: 7 },
      { name: 'HR Interview', order: 6, type: 'HR_INTERVIEW', description: 'HR and cultural fit interview', targetDays: 7 },
      { name: 'Manager Interview', order: 7, type: 'MANAGER_INTERVIEW', description: 'Hiring manager interview', targetDays: 14 },
      { name: 'Final Round', order: 8, type: 'FINAL_INTERVIEW', description: 'Final interview with leadership', targetDays: 14 },
      { name: 'Offer', order: 9, type: 'OFFER', description: 'Offer extended to candidate', targetDays: 7 },
      { name: 'Hired', order: 10, type: 'HIRED', description: 'Candidate accepted and onboarded', targetDays: 30 },
    ];

    const defaultCriteria = [
      { name: 'Technical Skills', category: 'TECHNICAL', description: 'Relevant technical knowledge and competency', weight: 2.0 },
      { name: 'Communication Skills', category: 'SOFT_SKILLS', description: 'Verbal and written communication ability', weight: 1.5 },
      { name: 'Problem Solving', category: 'COGNITIVE', description: 'Analytical thinking and problem resolution', weight: 1.5 },
      { name: 'Teamwork', category: 'SOFT_SKILLS', description: 'Ability to collaborate effectively', weight: 1.0 },
      { name: 'Leadership Potential', category: 'LEADERSHIP', description: 'Potential for future leadership roles', weight: 1.0 },
      { name: 'Cultural Fit', category: 'CULTURE', description: 'Alignment with hospital values and culture', weight: 1.5 },
      { name: 'Clinical Knowledge', category: 'TECHNICAL', description: 'Healthcare-specific clinical knowledge', weight: 2.0, appliesTo: 'CLINICAL' },
      { name: 'Patient Care', category: 'CLINICAL', description: 'Patient interaction and care quality', weight: 2.0, appliesTo: 'CLINICAL' },
    ];

    for (const ws of workspaces) {
      const wsId = ws.workspaceid;
      console.log(`📦 Seeding workspace: ${wsId}`);

      // Check if stages already exist
      const existingStages = await client.query(
        'SELECT COUNT(*) as count FROM recruitment_stages WHERE workspace_id = $1',
        [wsId]
      );

      if (parseInt(existingStages.rows[0].count) > 0) {
        console.log(`   ⏩ Stages already exist for this workspace, skipping...`);
      } else {
        // Insert default stages
        for (const stage of defaultStages) {
          await client.query(`
            INSERT INTO recruitment_stages (workspace_id, stage_name, stage_order, stage_type, stage_description, is_default, is_active, target_days)
            VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, $6)
          `, [wsId, stage.name, stage.order, stage.type, stage.description, stage.targetDays]);
        }
        console.log(`   ✅ ${defaultStages.length} default stages created`);
      }

      // Check if criteria already exist
      const existingCriteria = await client.query(
        'SELECT COUNT(*) as count FROM evaluation_criteria WHERE workspace_id = $1',
        [wsId]
      );

      if (parseInt(existingCriteria.rows[0].count) > 0) {
        console.log(`   ⏩ Evaluation criteria already exist, skipping...`);
      } else {
        // Insert default evaluation criteria
        for (const criteria of defaultCriteria) {
          await client.query(`
            INSERT INTO evaluation_criteria (workspace_id, criteria_name, criteria_category, description, weight, max_score, is_required, is_active, applies_to)
            VALUES ($1, $2, $3, $4, $5, 5.0, TRUE, TRUE, $6)
          `, [wsId, criteria.name, criteria.category, criteria.description, criteria.weight, criteria.appliesTo || 'ALL']);
        }
        console.log(`   ✅ ${defaultCriteria.length} default evaluation criteria created`);
      }
    }

    // Verify
    const stageCount = await client.query('SELECT COUNT(*) as count FROM recruitment_stages');
    const criteriaCount = await client.query('SELECT COUNT(*) as count FROM evaluation_criteria');
    console.log(`\n📊 Final counts:`);
    console.log(`   recruitment_stages: ${stageCount.rows[0].count} records`);
    console.log(`   evaluation_criteria: ${criteriaCount.rows[0].count} records`);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seedRecruitmentDefaults().then(() => {
  console.log('\n✅ Seeding completed!');
  process.exit(0);
});
