# Recruitment System Deployment Checklist

## Pre-Deployment

### Database
- [ ] Run migration: `node run_recruitment_migration.js`
- [ ] Verify all 23 tables created
- [ ] Run seed: `node seed_recruitment_defaults.js`
- [ ] Verify 70 recruitment stages + 56 evaluation criteria seeded
- [ ] Test database connectivity

### Environment Variables
```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

### API Endpoints (41 total)
| Module | Endpoints | Tested |
|--------|-----------|--------|
| Requisitions | 7 (CRUD + submit + approve) | ✅ |
| Applications | 8 (CRUD + move-stage + screen + notes + assign + pipeline) | ✅ |
| Interviews | 9 (CRUD + complete + cancel + evaluations + criteria + stats) | ✅ |
| Offers | 9 (CRUD + approve + send + respond + counter-offer + withdraw) | ✅ |
| Assessments | 4 (tests CRUD + assign + submit + review) | ✅ |
| Reference Checks | 3 (list + add + complete) | ✅ |
| Background Checks | 3 (list + request + complete) | ✅ |
| Health | 1 | ✅ |

### Frontend Pages (8 pages)
| Page | Path |
|------|------|
| Requisition List | `/hr/recruitment/requisitions` |
| New Requisition | `/hr/recruitment/requisitions/new` |
| Requisition Detail | `/hr/recruitment/requisitions/[id]` |
| Pipeline Board | `/hr/recruitment/pipeline` |
| Application Detail | `/hr/recruitment/applications/[id]` |
| Interview List | `/hr/recruitment/interviews` |
| Schedule Interview | `/hr/recruitment/interviews/schedule` |
| Interview Evaluation | `/hr/recruitment/interviews/[id]/evaluate` |

## Deployment Steps

1. **Install Dependencies**
```bash
npm install
```

2. **Run Database Migration**
```bash
node run_recruitment_migration.js
```

3. **Seed Default Data**
```bash
node seed_recruitment_defaults.js
```

4. **Build Application**
```bash
npm run build
```

5. **Run Tests**
```bash
node test_recruitment_apis.js
node test_prompt3_4_apis.js
node test_prompt5_6_apis.js
node test_prompt7_10_integration.js
```

6. **Verify Health Check**
```bash
curl http://localhost:3000/api/recruitment/health
```

## Post-Deployment

### Setup
- [ ] Verify default recruitment stages per workspace
- [ ] Verify evaluation criteria per workspace
- [ ] Configure user roles for approval workflows
- [ ] Import existing candidates if migrating from legacy system

### Training
- [ ] HR staff: Requisition creation & approval workflow
- [ ] Recruiters: Application pipeline & candidate management
- [ ] Interviewers: Evaluation form & scoring criteria
- [ ] Managers: Offer approval & negotiation

### Monitoring
- [ ] Health check endpoint: `/api/recruitment/health`
- [ ] Monitor API response times
- [ ] Track database query performance
- [ ] Watch for error logs in production

## Rollback Plan
1. Revert to previous deployment
2. Database tables are additive — no destructive changes to existing tables
3. Investigate error logs
4. Fix and redeploy
