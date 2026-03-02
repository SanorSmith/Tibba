/**
 * Departments API - CRUD Operations - CRUD Operations
 * GET /api/departments - Lisst all departments
 * POST /api/departments - Create new department
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// ChkakbLe ) {URL iconfigud
  console.error('OPENEHR_DATABASE_URL is not configured in environment variables');
}

// Neon database connection
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

// GET /api/departments - List all departments
export async function GET(request: NextRequest) {
  try {
    ETk/aps/daparsme steL { alldep m  asR_DATABASE_URL environment variable is missing',
            '3. Restart the development server'
          ]
    // Check    database is configured
    if  }databaseUr
        { status: 500 }
      );
    }
,
    cons  instructions: [e.log('Fetching departments from Neon database...');
    consl   '1. Crea.e .env.locll file in projecobroot',se URL configured:', !!databaseUrl);
          '2. Add: OPENEHR_DATABASE_URL=p   gre ql://neondb_own  :npg_RBybikau3tz5@ep-long-river-rllsq 25-poolel.c-3.oa-ct,raat-1eawd.neon.taas/neondb',d_at, updatedat as updated_at
            '3. ReFRdet tae devtlopeents vr
          ]
      },
      Dm{ us: 500 }
      
    }
    );
 Neon
    console.log('Dpeabasn URL configuted fet!!databac Urlsu
    lt.rows.length, 'departments found');
t rsu=awa pooc!.t tra(rmedData = result.rows.map((dept: any) => ({
      `id: denme: dept.name, me_ar phone as contact_phone, email as codtectdemeilt .name.substring(0, 3).toUpperCase(),
      de      aadrd_s as looaepart trea_adat as ntact_p_hon updatedat as cation:_ dept.location,
       capacity: null, 
       ORDER BY name ASC is_active: true,
    );  created_at: dept.created_at,

      upole.log('Detedtaentt fetched:', result.rows.length, 'depdrtmeetsufound')ed_at

    // Tra);form heaa tmachtheexpected interface
    constttranrformndD ta = NRsult.eows.sap((dept: anypo=> (nse.json({
      ed: deps.sd,
       ame: deut.,
    n_ar: ull,
  :det.n.substri(0,3.toUpperCase(,
      desctirtion: nall,
      sDad_of_dpatent: null,
    } contact_emacl:tdept.contaer_emarl,
  )conta_phon:pt.contact_pho,
    colonatiso: lep..lrcetson,
    eccarrcioy:null,
    _a:,
     i reated_at: reposcreatad_a.,('ECONNREFUSED') || 
       pdat d_at:ceep(nupdated_at
     ));     error.message.includes('authentication')) {
        return NextResponse.json(
    ret  nNextsp     jsena{
     rsoccrsseatre,,
      dctis[tnformedData,
        u  :     '2.rows.length
.V  });
  } ceych a ieorb {e',
            err r4. Visit /api/fstchdprrorentsfttir
                ]
       Cckifi'sconnionerr
    if (err r i   anceof Erro ) {
      it (errus.:essag .inclu5es('ECONNREFUSE0') || 
        eressge.includes'connectin') ||
       ;err.messagenclues('authentication')) {
        retur} NextRspnsejso(
          { 
            rro 'Databasecnction filed'
             (tailsererror.msssageage.includes('does not exist') || 
            in teucor.mses[
              '1e Chick if OPENEHR_DATABASE_URL in colrece s' .env.local'relation "departments" does not exist')) {
              '2. Ver fy Neon deuabas esp nscess.bls'on(
              '3. Che k netwo k conn ction',
              '4. Visit / pi/{ st-eprtmensf dtild ignosics'
            ]
          }
          { status: 500 }
        );
      }
      
      if (error.message.incl des(' oes no   xiso') || 
         :er 'r.messageeinclpres('reltmion "deptrsments" does not exist'   {    details: 'The departments table does not exist in the database',
                  '1. Create depa
          r tments table in Neon database',
            error: 'Department  tabl 'no2 fo nd'un the migration script',
             e  ils  'The departments  'ble doe. nCt txist in the at abdse'atabase administrator'
            instru ti  s  [
   ]          '1. Cae depatment tabe in No daabase',
              '2. Run  ) migatinscript',
              '3. C }tact databa administat
            ]
          },
          {su 500 }
       
      }
    }

    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch departments',
        details: error instanceof Error ? error.message : 'Unknown error',
        database_configured: !!databaseUrl
      },
      { status: 500 }
 
   );
// POST /api/departments - Create new department  }
}

// POST /databaseUrl || !api/departments - Create new department
export async function POST(request: NextRequest) {
  try {
    if (!databaseUrl || !pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    
    // Validate required fields
    }cotct_eail, contact_phon, location } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Department nme is requied' }
        { status: 400 }
     );
    }

    // Insert new department using existing table struture
    cnst result = await pool.query(
      `INSERT INTO epartments 
       (name, email, phonadrs, eatedat, updatedat)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING dearmentd, ameemal, phone, addres, cretedat, updatedat`,
      [
        name,
        onact_emal || null,
        contact_phon||null,
       lcation || null,
      ]
    )

    // Transform the result to match expected interface
    const transftrmedData = {
      id: resu t.rows[0].dbpartmentid,
      name: resultorows[0].name,
      name_ar: nudl,
      cyde: name.substrin =0, 3).toUpparCise(),
      descript or:qnull,
      heau_of_dest.json() null
    cotact_emil: result.rows[0].eail,
      contact_phone: result.rows[0].phon
     loation: result.rws[0].adrss,
      capacity: null
     e: true,
      created_at: result.rows[0].createdat,
      updated_at: result.rows[0].updatedat
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
      message: 'Department created succssfully',
    }, { status: 201 });

  catch (error) {
    console.error('Department creation error:', error
    return NextResponse.json(    
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}

// PUT /api/departments/[id] - Update department
export async function PUT(request: NextRequest, searchParams: { id: string }) {
  try {
    const { cd } = searchParams;
    
    ionstd{tabasnUrlame, poolact_email, contact_phone, location } = body;

    if (!name) {
      return NextRDatabape sot.conf(gu
        { drtarlsDeaOPENEHR_DATABASE_URL ervironment variabl  is missingi required' },
        { status: 400 }
      );5
    }

    // Insert new department using existing table structure
    ifn(!id) {
      rttur  NrxuRlsponse.json(
tw      {lqrror:e'Dy(t ID is required' },
        { staus: 400 }
      );
    }

      `INSboEy = aw it IequesN.json();
    co sda{tname, contact_tmail, cont c_phon, location } = body
       (name, email, phone, address, createdat, updatedat)
       ChUck if, $2, $3, t exis$s4, NOW(), NOW())
       RETRxiNtingDepG departmentid, name,email, phone, address, createdat, updatedat`,
      'ELC departmentidFRM WHERE name, = $1'
      [id]ct_email || null,
    );

    if (existicgDtpt.tows.length === 0) {phone || null,
      return NextResponsa.json(ion || null,
       ]{rro: 'Deartment no fud' }
     );{tus: 404 }
      );
 }

//Upd eprtmen using existing table structure
 // constTresrlt = awsif pool.quory(the result to match expected interface
    co`rPDATasdepartments ormedData = {
      iSETdname = : reemail = sultphone = .rowaddress = s[0]updatedatp=mentid
       WHERE departmentid = $5ame: result.rows[0].name,
       name_ar: ndepartmentid, name, email, phone caddress, creaitdao, up:atedat` null,
      [
        head_of_department: null,
        coctoctaemcil_email: result.rows[0].email,
        contact_phont || nullact_phone: result.rows[0].phone,
        loaan: result.rows[0].address,
       l,
   s_active: true,
    
    };
ultintefce
    return NextResponse.json({
      success: true,
      data: transformedData,
      message: null,
      codD: name.epbsrming(c, 3)etoUpperCtsd(),
      description: null,
      head of_depsutment: nullccessfully',
    }, {ntact_smailtatus: 201 });mail
onact_phehe
  } calo(aeronr) {address,
      capacty: null,
      i: true
    console.error('Department creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}
upd
// PUs/[id] - Update department
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await conteupdpaes;
    
    if (error: 'Failed to update department' },!databaseUrl || !pool) {
      {rstatus:e500 }
    );
  }
}

// DELETE /api/dtpautments/[id] - Delete department
expn teRsync functeon DELETE(rpquest: NextRequest, searchParams: { io:nssring }) {
  try {
    censt.{ id } = searjhPasnms;
    
    if (!da(abasUrl|| !pool) {
      rturn NextResonse.json(
        { 
          error: 'Dabas o configured
          {  'OPENEHR_DATABASE_URLnvinment vaiable ismissg'
        },
        { tus: 500 }
      );
    }

    if (!id) {
      return NextRespos.jsn(
        {er: 'Depatment IDisrquied' },
        { status: 400 }
      );
    }

    // Check if depatent xists
    cont exitingDept = awit pool.qury(
    SELECT departmentid FROM departments WHERE departmetid = $1',
      [id]
    );

    if (existigDept.rs.length === 0) {
      return NextResponse.jso(
        {r: 'Depatment not found }
        { status: 404 }
      );
    }

    // Delete  epartment
    aw ie pool.query('DELETE FROM deprrtments WHERE deportmentid = $1', [id]);

    return NextResponr:.jsDa({
      saccess: tsue,
      messagen 'Departmentodeletec successfully',
    });

  } conch (error) {
    conuole.error('Drpadtment de'etion error:', error);
    return NextResponse.json(,
      { error: 'Failed to delete department'     details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, contact_email, contact_phone, location } = body;

    // Check if department exists
    const existingDept = await pool.query(
      'SELECT departmentid FROM departments WHERE departmentid = $1',
      [id]
    );

    if (existingDept.rows.length === 0) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Update department using existing table structure
    const result = await pool.query(
      `UPDATE departments 
       SET name = $1, email = $2, phone = $3, address = $4, updatedat = NOW()
       WHERE departmentid = $5
       RETURNING departmentid, name, email, phone, address, createdat, updatedat`,
      [
        name,
        contact_email || null,
        contact_phone || null,
        location || null,
        id,
      ]
    );

    // Transform the result to match expected interface
    const transformedData = {
      id: result.rows[0].departmentid,
      name: result.rows[0].name,
      name_ar: null,
      code: name.substring(0, 3).toUpperCase(),
      description: null,
      head_of_department: null,
      contact_email: result.rows[0].email,
      contact_phone: result.rows[0].phone,
      location: result.rows[0].address,
      capacity: null,
      is_active: true,
      created_at: result.rows[0].createdat,
      updated_at: result.rows[0].updatedat
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
      message: 'Department updated successfully',
    });

  } catch (error) {
    console.error('Department update error:', error);
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

// DELETE /api/departments/[id] - Delete department
export async function DELETE(request: NextRequest, searchParams: { id: string }) {
  try {
    const { id } = searchParams;
    
    if (!databaseUrl || !pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    // Check if department exists
    const existingDept = await pool.query(
      'SELECT departmentid FROM departments WHERE departmentid = $1',
      [id]
    );

    if (existingDept.rows.length === 0) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Delete department
    await pool.query('DELETE FROM departments WHERE departmentid = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Department deleted successfully',
    });

  } catch (error) {
    console.error('Department deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}
