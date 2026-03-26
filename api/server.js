import express from "express";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 5432),
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok", db: true });
  } catch (e) {
    return res.status(500).json({ status: "error", db: false });
  }
});

app.post("/api/leads", async (req, res) => {
  const leads = req.body;
  if (!Array.isArray(leads) || leads.length === 0)
    return res.status(400).json({ error: "Payload deve ser um array de leads" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const query = `INSERT INTO leads (title,address,phone,site,email,niche,city,source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (phone,email) DO NOTHING RETURNING id`;
    let inserted = 0;
    for (const lead of leads) {
      const {title,address=null,phone=null,site=null,email=null,niche,city=null,source="google_maps"} = lead;
      if (!title || !niche) continue;
      const r = await client.query(query,[title,address,phone,site,email,niche,city,source]);
      if (r.rowCount > 0) inserted++;
    }
    await client.query("COMMIT");
    return res.json({ ok:true, inserted, total_received:leads.length });
  } catch(err) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

app.get("/api/leads", async (req, res) => {
  const { niche, status, city, limit=100 } = req.query;
  const where=[]; const params=[]; let i=1;
  if(niche)  { where.push(`niche=$${i++}`);       params.push(niche); }
  if(status) { where.push(`status=$${i++}`);      params.push(status); }
  if(city)   { where.push(`city ILIKE $${i++}`);  params.push(`%${city}%`); }
  const wc = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(Number(limit));
  try {
    const r = await pool.query(`SELECT * FROM leads ${wc} ORDER BY created_at DESC LIMIT $${i}`,params);
    return res.json({ ok:true, count:r.rowCount, leads:r.rows });
  } catch(err) { return res.status(500).json({ error:err.message }); }
});

app.get("/api/leads/disparo", async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT l.*,
        CASE WHEN l.phone IS NOT NULL THEN 'whatsapp'
             WHEN l.email IS NOT NULL THEN 'email'
             ELSE 'sem_contato' END AS canal_sugerido
      FROM leads l
      WHERE l.status='novo'
        AND (l.phone IS NOT NULL OR l.email IS NOT NULL)
        AND NOT EXISTS (SELECT 1 FROM disparos d WHERE d.lead_id=l.id)
      ORDER BY CASE WHEN l.phone IS NOT NULL THEN 0 ELSE 1 END, l.created_at ASC
      LIMIT 100`);
    return res.json({ ok:true, count:r.rowCount, leads:r.rows });
  } catch(err) { return res.status(500).json({ error:err.message }); }
});

app.post("/api/disparos", async (req, res) => {
  const { lead_id, canal, template } = req.body;
  if(!lead_id||!canal||!template)
    return res.status(400).json({ error:"lead_id, canal e template sao obrigatorios" });
  try {
    const r = await pool.query(
      `INSERT INTO disparos (lead_id,canal,template,status,sent_at) VALUES ($1,$2,$3,'enviado',NOW()) RETURNING *`,
      [lead_id,canal,template]);
    await pool.query(`UPDATE leads SET status='contatado',updated_at=NOW() WHERE id=$1`,[lead_id]);
    return res.json({ ok:true, disparo:r.rows[0] });
  } catch(err) { return res.status(500).json({ error:err.message }); }
});

app.get("/api/relatorio", async (req, res) => {
  try {
    const [tot,niche,stat,phone,email,disp] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM leads"),
      pool.query("SELECT niche,COUNT(*) FROM leads GROUP BY niche ORDER BY COUNT(*) DESC"),
      pool.query("SELECT status,COUNT(*) FROM leads GROUP BY status ORDER BY COUNT(*) DESC"),
      pool.query("SELECT COUNT(*) FROM leads WHERE phone IS NOT NULL"),
      pool.query("SELECT COUNT(*) FROM leads WHERE email IS NOT NULL"),
      pool.query("SELECT COUNT(*) FROM disparos WHERE status='enviado'")
    ]);
    return res.json({
      ok:true,
      total_leads:Number(tot.rows[0].count),
      com_phone:Number(phone.rows[0].count),
      com_email:Number(email.rows[0].count),
      disparados:Number(disp.rows[0].count),
      por_niche:niche.rows,
      por_status:stat.rows
    });
  } catch(err) { return res.status(500).json({ error:err.message }); }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API de leads rodando na porta ${port}`));