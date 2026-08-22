import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  LayoutDashboard, Upload, Users, Gift, DollarSign,
  LogOut, Check, X, ChevronRight, Plus, AlertTriangle,
  TrendingUp, Truck, ToggleLeft, ToggleRight,
  Search, Bell, Menu, RefreshCw, MapPin, Trash2
} from 'lucide-react'
import './admin.css'

const CAN_WEIGHT_KG = 0.015

const SCREENS = {
  LOGIN:'login', DASHBOARD:'dashboard', UPLOADS:'uploads',
  COLLECTORS:'collectors', REWARDS:'rewards', SETTLEMENT:'settlement',
  DROP_POINTS:'drop_points'
}

const CITIES = ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad','Jaipur','Surat','Lucknow','Kanpur','Nagpur','Indore','Thane','Bhopal','Patna','Vadodara','Ghaziabad','Noida']
const MATERIAL_TAGS = ['Cans','Beer Bottles','Cardboard','Paper','Books','Plastic','E-Waste','All Materials']
const DP_ICONS = ['☕','🏋️','🎓','🏪','🏢','🏬','🏥','🏦','🌳','🛒','🎯','🍕']
const DP_COLORS = ['#D1FAE5','#FEF3C7','#DBEAFE','#F3E8FF','#FCE7F3','#FEE2E2','#FEF9C3','#E0F2FE']

const frameReset = `body{display:block!important;overflow:auto!important;background:#F8FAFC!important}#root{width:100vw!important;max-width:100vw!important;height:auto!important;min-height:100vh!important;border-radius:0!important;overflow:visible!important;box-shadow:none!important;background:transparent!important}`

const calcAmount = (cans, rate) => Math.round(cans * CAN_WEIGHT_KG * rate)

const fmtTimeAgo = (ts) => {
  const mins = Math.floor((Date.now() - new Date(ts)) / 60000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`
  return `${Math.floor(mins/1440)}d ago`
}

// ── Rewards catalog (managed in DB but we keep local for display for now) ──
const REWARDS_MOCK = [
  { id:'r1', name:'Free Coffee',        emoji:'☕', coins:60,  category:'Cafes',    partner:'Brew & Beans', redeemed:142, stock:null,  active:true  },
  { id:'r2', name:"Domino's ₹100 Off",  emoji:'🍕', coins:120, category:'Food',     partner:'Dominos',      redeemed:89,  stock:200,   active:true  },
  { id:'r3', name:'Movie Ticket ₹200',  emoji:'🎬', coins:180, category:'Fun',      partner:'BookMyShow',   redeemed:54,  stock:100,   active:true  },
  { id:'r4', name:'Myntra ₹150',        emoji:'🛍️', coins:200, category:'Shopping', partner:'Myntra',       redeemed:38,  stock:150,   active:true  },
  { id:'r5', name:'Gym Day Pass',       emoji:'🏋️', coins:100, category:'Fun',      partner:'FitZone',      redeemed:71,  stock:null,  active:true  },
  { id:'r6', name:'Spotify 1 Month',    emoji:'🎵', coins:150, category:'Fun',      partner:'Spotify',      redeemed:29,  stock:50,    active:false },
  { id:'r7', name:'Mystery Box',        emoji:'📦', coins:75,  category:'Mystery',  partner:'Reloop',       redeemed:201, stock:null,  active:true  },
]

export default function AdminApp() {
  // ── Auth state ───────────────────────────────────────────────
  const [adminUser, setAdminUser]   = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // ── UI state ─────────────────────────────────────────────────
  const [screen, setScreen]             = useState(SCREENS.LOGIN)
  const [loginEmail, setLoginEmail]     = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginErr, setLoginErr]         = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [uploads, setUploads]           = useState([])
  const [uploadsLoading, setUploadsLoading] = useState(false)
  const [collectors, setCollectors]     = useState([])
  const [collectorsLoading, setCollectorsLoading] = useState(false)
  const [settlement, setSettlement]     = useState([])
  const [rewards, setRewards]           = useState(REWARDS_MOCK)
  const [toast, setToast]               = useState(null)
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [showAddReward, setShowAddReward]       = useState(false)
  const [showAddCollector, setShowAddCollector] = useState(false)
  const [newReward, setNewReward]       = useState({ name:'', emoji:'🎁', coins:'', category:'Food', partner:'', coupon:'', stock:'' })
  const [newCollector, setNewCollector] = useState({ name:'', email:'', phone:'', zone:'', radius:'4', rate_per_kg:'120' })
  const [editRateFor, setEditRateFor]   = useState(null)
  const [editRateVal, setEditRateVal]   = useState('')
  const [search, setSearch]             = useState('')
  const [lightbox, setLightbox]         = useState(null) // { urls: [], idx: 0 }
  const [statsLoading, setStatsLoading] = useState(false)
  const [dbStats, setDbStats]           = useState({ totalUsers: 0, totalCans: 0, categoryStats: {} })
  // drop points
  const [dropPoints, setDropPoints]         = useState([])
  const [dpLoading, setDpLoading]           = useState(false)
  const [showAddDp, setShowAddDp]           = useState(false)
  const [dpSearch, setDpSearch]             = useState('')
  const [dpCityFilter, setDpCityFilter]     = useState('All')
  const [newDp, setNewDp]                   = useState({ name:'', address:'', city:'Mumbai', icon:'☕', bg_color:'#D1FAE5', tags:[], status:'active' })

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  // ── Data loaders ─────────────────────────────────────────────
  const ITEMS_CATALOG_NAMES = { cans:'Aluminium Cans', bottles:'Beer Bottles', cardboard:'Cardboard', paper:'Paper', books:'Books' }
  const ITEMS_EMOJI = { cans:'🥫', bottles:'🍺', cardboard:'📦', paper:'📄', books:'📚' }

  const loadUploads = useCallback(async () => {
    setUploadsLoading(true)
    const { data, error } = await supabase
      .from('uploads')
      .select('id, can_count, photo_url, photo_urls, item_types, estimated_weight_range, pickup_type, pickup_address, collector_weights, collector_counts, collector_photos, verified_at, risk_score, fraud_flags, created_at, users!user_id(name, city), drop_points(name)')
      .eq('status', 'pending')
      .order('risk_score', { ascending: false })
      .order('created_at', { ascending: true })
    setUploadsLoading(false)
    if (error) { showToast('Failed to load uploads: ' + error.message, 'error'); return }
    setUploads((data || []).map(u => ({
      id: u.id,
      user: u.users?.name || 'Unknown User',
      city: u.users?.city || 'Mumbai',
      zone: u.drop_points?.name || '—',
      reported: u.can_count,
      risk: u.risk_score || 0,
      time: fmtTimeAgo(u.created_at),
      photo: u.photo_url || '🥫',
      photoUrls: u.photo_urls || [],
      itemTypes: u.item_types || [],
      weightRange: u.estimated_weight_range,
      pickupType: u.pickup_type || 'dropoff',
      pickupAddress: u.pickup_address,
      collectorWeights: u.collector_weights,
      collectorCounts: u.collector_counts,
      collectorPhotos: u.collector_photos || [],
      verifiedAt: u.verified_at,
    })))
  }, [])

  const loadCollectors = useCallback(async () => {
    setCollectorsLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const [{ data: colls, error }, { data: summary }] = await Promise.all([
      supabase.from('collectors').select('*').order('name'),
      supabase.from('collector_daily_summary').select('*').eq('date', today),
    ])
    setCollectorsLoading(false)
    if (error) { showToast('Failed to load collectors: ' + error.message, 'error'); return }
    const sumMap = Object.fromEntries((summary || []).map(s => [s.collector_id, s]))
    setCollectors((colls || []).map(c => ({
      ...c,
      radius: c.radius_km,
      cans_today: Number(sumMap[c.id]?.total_cans || 0),
      pickups_today: Number(sumMap[c.id]?.pickups_count || 0),
      cans_total: 0,
      joined: new Date(c.joined_at).toLocaleDateString('en-IN', { month:'short', year:'numeric' }),
    })))
  }, [])

  const loadSettlement = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('collector_daily_summary')
      .select('*')
      .eq('date', today)
    if (error) return
    setSettlement((data || []).map(s => ({
      collector_id: s.collector_id,
      collector: s.collector_name,
      cans: Number(s.total_cans),
      rate_per_kg: Number(s.rate_per_kg),
      pickups: Number(s.pickups_count),
      amount: Number(s.amount_due),
      status: 'pending',
    })))
  }, [])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    const [{ count: userCount }, { data: approvedUploads }] = await Promise.all([
      supabase.from('users').select('*', { count:'exact', head:true }),
      supabase.from('uploads').select('can_count, item_types, collector_weights, collector_counts').eq('status','approved'),
    ])
    const catStats = { cans:{count:0,weight:0}, bottles:{count:0,weight:0}, cardboard:{count:0,weight:0}, paper:{count:0,weight:0}, books:{count:0,weight:0} }
    let totalCans = 0
    for (const u of (approvedUploads || [])) {
      totalCans += Number(u.can_count) || 0
      if (u.collector_counts) {
        for (const [cat, cnt] of Object.entries(u.collector_counts)) {
          if (catStats[cat]) catStats[cat].count += Number(cnt) || 0
        }
      } else if (u.can_count && (!u.item_types || u.item_types.includes('cans'))) {
        catStats.cans.count += Number(u.can_count) || 0
      }
      if (u.collector_weights) {
        for (const [cat, kg] of Object.entries(u.collector_weights)) {
          if (catStats[cat]) catStats[cat].weight += Number(kg) || 0
        }
      }
    }
    setDbStats({ totalUsers: userCount || 0, totalCans, categoryStats: catStats })
    setStatsLoading(false)
  }, [])

  const loadDropPoints = useCallback(async () => {
    setDpLoading(true)
    const { data } = await supabase.from('drop_points').select('*').order('city').order('name')
    setDpLoading(false)
    setDropPoints(data || [])
  }, [])

  const loadAllData = useCallback(async () => {
    await Promise.all([loadUploads(), loadCollectors(), loadSettlement(), loadStats(), loadDropPoints()])
  }, [loadUploads, loadCollectors, loadSettlement, loadStats, loadDropPoints])

  // ── Auth setup ───────────────────────────────────────────────
  useEffect(() => {
    // Hard timeout — if Supabase hangs, clear loading after 4s and show login
    const timeout = setTimeout(() => setAuthLoading(false), 4000)

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeout)
        const u = session?.user
        setAdminUser(u || null)
        if (u?.app_metadata?.role === 'admin') {
          setScreen(SCREENS.DASHBOARD)
          loadAllData()
        }
        setAuthLoading(false)
      })
      .catch(() => {
        clearTimeout(timeout)
        setAuthLoading(false)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAdminUser(null)
        setScreen(SCREENS.LOGIN)
      }
    })
    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [loadAllData])

  // ── Fix phone-frame styles ───────────────────────────────────
  useEffect(() => {
    const root = document.getElementById('root')
    const body = document.body
    const prevRoot = root.getAttribute('style') || ''
    const prevBody = body.getAttribute('style') || ''
    root.setAttribute('style', 'width:100vw;max-width:100vw;height:auto;min-height:100vh;border-radius:0;overflow:visible;background:transparent')
    body.setAttribute('style', 'display:block;overflow:auto;background:#F8FAFC')
    return () => { root.setAttribute('style', prevRoot); body.setAttribute('style', prevBody) }
  }, [])

  // ── Auth actions ─────────────────────────────────────────────
  const signIn = async () => {
    if (!loginEmail || !loginPassword) return
    setLoginLoading(true)
    setLoginErr('')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail, password: loginPassword
    })
    setLoginLoading(false)
    if (error) { setLoginErr(error.message); return }
    const u = data.user
    if (u?.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut()
      setLoginErr('Not authorized as admin. Check your role in Supabase.')
      return
    }
    setAdminUser(u)
    setScreen(SCREENS.DASHBOARD)
    loadAllData()
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUploads([])
    setCollectors([])
    setSettlement([])
  }

  // ── Uploads actions ──────────────────────────────────────────
  const approveUpload = async (id) => {
    const { error } = await supabase.rpc('approve_upload', {
      p_upload_id: id,
      p_admin_id: adminUser.id,
    })
    if (error) { showToast('Approval failed: ' + error.message, 'error'); return }
    setUploads(u => u.filter(x => x.id !== id))
    showToast('Upload approved — GreenCoins credited')
  }

  const rejectUpload = async (id) => {
    const { error } = await supabase.rpc('reject_upload', {
      p_upload_id: id,
      p_admin_id: adminUser.id,
      p_reason: 'Photo unclear or invalid',
    })
    if (error) { showToast('Rejection failed: ' + error.message, 'error'); return }
    setUploads(u => u.filter(x => x.id !== id))
    showToast('Upload rejected', 'error')
  }

  // ── Collectors actions ───────────────────────────────────────
  const addCollector = async () => {
    if (!newCollector.name || !newCollector.email || !newCollector.zone) return
    const { error } = await supabase.from('collectors').insert({
      name: newCollector.name,
      email: newCollector.email.toLowerCase(),
      phone: newCollector.phone || null,
      zone: newCollector.zone,
      radius_km: Number(newCollector.radius) || 4,
      rate_per_kg: Number(newCollector.rate_per_kg) || 120,
      status: 'active',
    })
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    setNewCollector({ name:'', email:'', phone:'', zone:'', radius:'4', rate_per_kg:'120' })
    setShowAddCollector(false)
    showToast('Collector added — create their login in Supabase Auth → Users')
    loadCollectors()
  }

  const saveCollectorRate = async () => {
    const v = Number(editRateVal)
    if (!v || v <= 0) return
    const { error } = await supabase.from('collectors').update({ rate_per_kg: v }).eq('id', editRateFor)
    if (error) { showToast('Error updating rate', 'error'); return }
    setCollectors(cc => cc.map(x => x.id === editRateFor ? { ...x, rate_per_kg: v } : x))
    showToast(`Rate updated to ₹${v}/kg`)
    setEditRateFor(null)
  }

  const toggleCollector = async (c) => {
    const newStatus = c.status === 'active' ? 'inactive' : 'active'
    const { error } = await supabase.from('collectors').update({ status: newStatus }).eq('id', c.id)
    if (error) { showToast('Error updating status', 'error'); return }
    setCollectors(cc => cc.map(x => x.id === c.id ? { ...x, status: newStatus } : x))
    showToast(`${c.name.split(' ')[0]} ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
  }

  const toggleReward = (id) => setRewards(r => r.map(x => x.id === id ? { ...x, active: !x.active } : x))

  const addDropPoint = async () => {
    if (!newDp.name.trim() || !newDp.address.trim() || !newDp.city) return
    const { error } = await supabase.from('drop_points').insert({
      name: newDp.name.trim(),
      address: newDp.address.trim(),
      city: newDp.city,
      icon: newDp.icon,
      bg_color: newDp.bg_color,
      tags: newDp.tags,
      status: 'active',
    })
    if (error) { showToast('Error: ' + error.message, 'error'); return }
    setNewDp({ name:'', address:'', city:'Mumbai', icon:'☕', bg_color:'#D1FAE5', tags:[], status:'active' })
    setShowAddDp(false)
    showToast('Drop point added!')
    loadDropPoints()
  }

  const toggleDropPoint = async (dp) => {
    const next = dp.status === 'active' ? 'inactive' : 'active'
    const { error } = await supabase.from('drop_points').update({ status: next }).eq('id', dp.id)
    if (error) { showToast('Error updating status', 'error'); return }
    setDropPoints(prev => prev.map(x => x.id === dp.id ? { ...x, status: next } : x))
    showToast(`${dp.name.split(' ')[0]} ${next === 'active' ? 'activated' : 'deactivated'}`)
  }

  const deleteDropPoint = async (id) => {
    if (!confirm('Delete this drop point? This cannot be undone.')) return
    const { error } = await supabase.from('drop_points').delete().eq('id', id)
    if (error) { showToast('Error deleting: ' + error.message, 'error'); return }
    setDropPoints(prev => prev.filter(x => x.id !== id))
    showToast('Drop point deleted')
  }

  const addReward = () => {
    if (!newReward.name || !newReward.coins) return
    setRewards(r => [...r, { ...newReward, id: Date.now().toString(), coins: Number(newReward.coins), redeemed: 0, stock: newReward.stock ? Number(newReward.stock) : null, active: true }])
    setNewReward({ name:'', emoji:'🎁', coins:'', category:'Food', partner:'', coupon:'', stock:'' })
    setShowAddReward(false)
    showToast('Reward added (sync to DB coming soon)')
  }

  const createSettlement = async (collectorId) => {
    const { error } = await supabase.rpc('create_daily_settlement', { p_collector_id: collectorId })
    if (error) { showToast('Settlement error: ' + error.message, 'error'); return }
    showToast('Settlement created')
    setSettlement(s => s.map(x => x.collector_id === collectorId ? { ...x, status: 'settled' } : x))
  }

  // ── Lightbox helpers ─────────────────────────────────────────
  const openLightbox = (urls, idx = 0) => setLightbox({ urls: urls.filter(Boolean), idx })
  const closeLightbox = () => setLightbox(null)
  const lbPrev = () => setLightbox(l => ({ ...l, idx: (l.idx - 1 + l.urls.length) % l.urls.length }))
  const lbNext = () => setLightbox(l => ({ ...l, idx: (l.idx + 1) % l.urls.length }))

  // ── Derived stats ────────────────────────────────────────────
  const pendingCount   = uploads.length
  const totalCansToday = collectors.reduce((s, c) => s + c.cans_today, 0)
  const totalOwed      = settlement.filter(s => s.status === 'pending').reduce((s, x) => s + x.amount, 0)
  const activeColls    = collectors.filter(c => c.status === 'active').length

  const NAV = [
    { id:SCREENS.DASHBOARD,   label:'Dashboard',    icon:LayoutDashboard },
    { id:SCREENS.UPLOADS,     label:'Uploads',      icon:Upload, badge: pendingCount },
    { id:SCREENS.COLLECTORS,  label:'Collectors',   icon:Truck },
    { id:SCREENS.DROP_POINTS, label:'Drop Points',  icon:MapPin, badge: dropPoints.filter(d=>d.status==='active').length || 0 },
    { id:SCREENS.REWARDS,     label:'Rewards',      icon:Gift },
    { id:SCREENS.SETTLEMENT,  label:'Settlement',   icon:DollarSign },
  ]

  // ── Loading splash ────────────────────────────────────────────
  if (authLoading) return (
    <>
    <style>{frameReset}</style>
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#F8FAFC'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:32,fontWeight:800,color:'#159A5B',marginBottom:8}}><span style={{color:'#159A5B'}}>re</span><span style={{color:'#111'}}>loop</span></div>
        <div style={{fontSize:14,color:'#6B7280'}}>Loading…</div>
      </div>
    </div>
    </>
  )

  // ── Login ─────────────────────────────────────────────────────
  if (screen === SCREENS.LOGIN) return (
    <>
    <style>{frameReset}</style>
    <div className="a-login">
      <div className="a-login-box">
        <div className="a-brand"><span className="a-green">re</span>loop</div>
        <div className="a-login-title">Admin Panel</div>
        <div className="a-login-sub">Internal use only</div>
        <div className="a-float-field">
          <input
            type="email" placeholder=" "
            className={loginErr ? 'err' : ''}
            value={loginEmail}
            onChange={e => { setLoginEmail(e.target.value); setLoginErr('') }}
            onKeyDown={e => e.key === 'Enter' && signIn()}
          />
          <label>Email Address</label>
        </div>
        <div className="a-float-field">
          <input
            type="password" placeholder=" "
            className={loginErr ? 'err' : ''}
            value={loginPassword}
            onChange={e => { setLoginPassword(e.target.value); setLoginErr('') }}
            onKeyDown={e => e.key === 'Enter' && signIn()}
          />
          <label>Password</label>
        </div>
        {loginErr && <div className="a-err-msg">{loginErr}</div>}
        <button className="a-btn-primary" onClick={signIn} disabled={loginLoading}>
          {loginLoading ? 'Signing in…' : 'Sign In'}
        </button>
        <div className="a-hint">Use your Supabase admin credentials</div>
      </div>
    </div>
    </>
  )

  // ── Main shell ────────────────────────────────────────────────
  return (
    <>
    <style>{frameReset}</style>
    <div className="a-shell">
      {/* Sidebar */}
      <aside className={`a-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="a-sidebar-brand">
          <span className="a-green">re</span>loop
          <span className="a-admin-tag">Admin</span>
        </div>
        <nav className="a-nav">
          {NAV.map(n => (
            <button key={n.id} className={`a-nav-item ${screen === n.id ? 'active' : ''}`}
              onClick={() => { setScreen(n.id); setSidebarOpen(false) }}>
              <n.icon size={17}/>
              <span>{n.label}</span>
              {n.badge > 0 && <span className="a-nav-badge">{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div style={{padding:'12px 16px',borderTop:'1px solid var(--a-border)',fontSize:12,color:'var(--a-sub)'}}>
          {adminUser?.email}
        </div>
        <button className="a-nav-item a-logout" onClick={signOut}>
          <LogOut size={17}/><span>Log Out</span>
        </button>
      </aside>

      {/* Main */}
      <main className="a-main" onClick={() => setSidebarOpen(false)}>
        {/* Topbar */}
        <div className="a-topbar">
          <button className="a-menu-btn" onClick={e => { e.stopPropagation(); setSidebarOpen(s => !s) }}>
            <Menu size={20}/>
          </button>
          <div className="a-topbar-title">{NAV.find(n => n.id === screen)?.label}</div>
          <div className="a-topbar-right">
            <button className="a-notif-btn" title="Refresh" onClick={loadAllData} style={{cursor:'pointer'}}>
              <RefreshCw size={16}/>
            </button>
            <div className="a-avatar">A</div>
          </div>
        </div>

        <div className="a-content">

          {/* ── DASHBOARD ── */}
          {screen === SCREENS.DASHBOARD && (
            <div>
              <div className="a-stat-grid">
                {[
                  { label:'Pending Uploads',     value: uploadsLoading ? '…' : pendingCount,                   icon:'⏳', color:'#FEF3C7', tx:'#D97706' },
                  { label:'Cans Collected Today', value: collectorsLoading ? '…' : totalCansToday,             icon:'🥫', color:'#D1FAE5', tx:'#059669' },
                  { label:'Active Collectors',    value: collectorsLoading ? '…' : activeColls,                icon:'🚛', color:'#DBEAFE', tx:'#2563EB' },
                  { label:'Amount Owed Today',    value: `₹${totalOwed.toLocaleString()}`,                     icon:'💰', color:'#F3E8FF', tx:'#7C3AED' },
                ].map((s,i) => (
                  <div key={i} className="a-stat-card" style={{ borderTop:`3px solid ${s.tx}` }}>
                    <div className="a-stat-ico" style={{ background:s.color }}>{s.icon}</div>
                    <div className="a-stat-val">{s.value}</div>
                    <div className="a-stat-lbl">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="a-two-col">
                <div className="a-card">
                  <div className="a-card-hd">
                    <span>Pending Uploads</span>
                    <button className="a-link" onClick={() => setScreen(SCREENS.UPLOADS)}>View all →</button>
                  </div>
                  {uploadsLoading ? (
                    <div style={{textAlign:'center',padding:24,color:'var(--a-sub)'}}>Loading…</div>
                  ) : uploads.length === 0 ? (
                    <div style={{textAlign:'center',padding:24,color:'var(--a-sub)'}}>
                      <div style={{fontSize:32}}>✅</div>
                      <div style={{marginTop:8}}>All caught up!</div>
                    </div>
                  ) : (
                    <table className="a-table">
                      <thead><tr><th>User</th><th>Cans</th><th>Risk</th><th>Time</th></tr></thead>
                      <tbody>
                        {uploads.slice(0,4).map(u => (
                          <tr key={u.id}>
                            <td><div className="a-user-cell"><div className="a-avatar-sm">{u.user[0]}</div>{u.user}</div></td>
                            <td><strong>{u.reported}</strong></td>
                            <td><span className={`a-risk ${u.risk >= 60 ? 'high' : u.risk >= 20 ? 'med' : 'low'}`}>{u.risk >= 60 ? 'High' : u.risk >= 20 ? 'Med' : 'Low'}</span></td>
                            <td style={{color:'var(--a-sub)',fontSize:12}}>{u.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="a-card">
                  <div className="a-card-hd">
                    <span>Collectors Today</span>
                    <button className="a-link" onClick={() => setScreen(SCREENS.COLLECTORS)}>View all →</button>
                  </div>
                  {collectorsLoading ? (
                    <div style={{textAlign:'center',padding:24,color:'var(--a-sub)'}}>Loading…</div>
                  ) : collectors.length === 0 ? (
                    <div style={{textAlign:'center',padding:24,color:'var(--a-sub)'}}>
                      <div style={{fontSize:32}}>🚛</div>
                      <div style={{marginTop:8}}>No collectors yet</div>
                    </div>
                  ) : (
                    <table className="a-table">
                      <thead><tr><th>Name</th><th>Zone</th><th>Cans</th><th>Status</th></tr></thead>
                      <tbody>
                        {collectors.map(c => (
                          <tr key={c.id}>
                            <td><div className="a-user-cell"><div className="a-avatar-sm" style={{background:'#D1FAE5',color:'#059669'}}>{c.name[0]}</div>{c.name.split(' ')[0]}</div></td>
                            <td style={{color:'var(--a-sub)',fontSize:13}}>{c.zone}</td>
                            <td><strong>{c.cans_today}</strong></td>
                            <td><span className={`a-chip ${c.status}`}>{c.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* ── Materials Breakdown ── */}
              <div className="a-card" style={{marginTop:20}}>
                <div className="a-card-hd">
                  <span>Materials Breakdown · All Time (Approved)</span>
                  {statsLoading && <span style={{fontSize:12,color:'var(--a-sub)'}}>Loading…</span>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:12,padding:'4px 0'}}>
                  {[
                    { key:'cans',      label:'Aluminium Cans', emoji:'🥫', color:'#D1FAE5', tx:'#059669' },
                    { key:'bottles',   label:'Beer Bottles',   emoji:'🍺', color:'#FEF3C7', tx:'#D97706' },
                    { key:'cardboard', label:'Cardboard',      emoji:'📦', color:'#DBEAFE', tx:'#2563EB' },
                    { key:'paper',     label:'Paper',          emoji:'📄', color:'#F3E8FF', tx:'#7C3AED' },
                    { key:'books',     label:'Books',          emoji:'📚', color:'#FCE7F3', tx:'#DB2777' },
                  ].map(cat => {
                    const s = dbStats.categoryStats?.[cat.key] || { count:0, weight:0 }
                    return (
                      <div key={cat.key} style={{background:cat.color,borderRadius:12,padding:'14px 16px',border:`1.5px solid ${cat.tx}22`}}>
                        <div style={{fontSize:24,marginBottom:6}}>{cat.emoji}</div>
                        <div style={{fontSize:11,fontWeight:700,color:cat.tx,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>{cat.label}</div>
                        <div style={{fontSize:22,fontWeight:800,color:'#111'}}>{s.count.toLocaleString()}</div>
                        <div style={{fontSize:11,color:'#6B7280',marginTop:2}}>items collected</div>
                        {s.weight > 0 && <div style={{fontSize:12,fontWeight:600,color:cat.tx,marginTop:4}}>{s.weight.toFixed(1)} kg</div>}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="a-card" style={{marginTop:20}}>
                <div className="a-card-hd"><span>Mumbai · Active Zones</span><span style={{fontSize:12,color:'var(--a-sub)'}}>Interactive map — coming soon</span></div>
                <div className="a-map-ph">
                  <div className="a-map-inner">
                    {collectors.filter(c=>c.status==='active').map((c,i)=>(
                      <div key={c.id} className="a-map-zone" style={{left:`${20+i*20}%`,top:`${25+i*15}%`}}>
                        <div className="a-zone-ring"/>
                        <div className="a-zone-dot">🚛</div>
                        <div className="a-zone-label">{c.name.split(' ')[0]}<br/>{c.zone}</div>
                      </div>
                    ))}
                  </div>
                  <div className="a-map-legend">
                    <span>🟢 Active collector zone</span>
                    <span>🥫 Pending pickup</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── UPLOADS QUEUE ── */}
          {screen === SCREENS.UPLOADS && (
            <div>
              <div className="a-page-hd">
                <div>
                  <div className="a-page-title">Upload Queue</div>
                  <div className="a-page-sub">{uploadsLoading ? 'Loading…' : `${uploads.length} pending · Review and approve`}</div>
                </div>
                <div className="a-search-wrap">
                  <Search size={15}/>
                  <input className="a-search" placeholder="Search user…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
              </div>

              {/* Category summary for pending queue */}
              {!uploadsLoading && uploads.length > 0 && (() => {
                const pendingCats = { cans:{count:0,label:'Aluminium Cans',emoji:'🥫'}, bottles:{count:0,label:'Beer Bottles',emoji:'🍺'}, cardboard:{count:0,label:'Cardboard',emoji:'📦'}, paper:{count:0,label:'Paper',emoji:'📄'}, books:{count:0,label:'Books',emoji:'📚'} }
                for (const u of uploads) {
                  for (const t of (u.itemTypes || [])) { if (pendingCats[t]) pendingCats[t].count++ }
                  if ((!u.itemTypes || u.itemTypes.length === 0) && u.reported) pendingCats.cans.count++
                }
                const active = Object.entries(pendingCats).filter(([,v]) => v.count > 0)
                if (!active.length) return null
                return (
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                    {active.map(([key, cat]) => (
                      <div key={key} style={{display:'flex',alignItems:'center',gap:6,background:'#F9FAFB',border:'1px solid #E5E7EB',borderRadius:20,padding:'6px 14px',fontSize:13,fontWeight:600}}>
                        <span>{cat.emoji}</span>
                        <span style={{color:'#111'}}>{cat.label}</span>
                        <span style={{background:'#159A5B',color:'#fff',borderRadius:20,padding:'1px 8px',fontSize:12,fontWeight:700}}>{cat.count}</span>
                      </div>
                    ))}
                    <div style={{display:'flex',alignItems:'center',gap:6,background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:20,padding:'6px 14px',fontSize:13,fontWeight:600,color:'#92400E'}}>
                      ⏳ {uploads.length} total pending
                    </div>
                  </div>
                )
              })()}

              {uploadsLoading && <div style={{textAlign:'center',padding:40,color:'var(--a-sub)'}}>Loading uploads…</div>}

              {!uploadsLoading && uploads.length === 0 && (
                <div className="a-empty">
                  <div style={{fontSize:48}}>✅</div>
                  <div className="a-empty-title">All caught up!</div>
                  <div className="a-empty-sub">No pending uploads</div>
                </div>
              )}

              <div className="a-upload-list">
                {uploads.filter(u => u.user.toLowerCase().includes(search.toLowerCase())).map(u => (
                  <div key={u.id} className={`a-upload-card ${u.risk >= 60 ? 'flagged' : ''}`}>
                    {u.risk >= 60 && (
                      <div className="a-flag-banner"><AlertTriangle size={13}/> High fraud risk — review carefully</div>
                    )}

                    {/* Pickup type badge */}
                    {u.pickupType === 'pickup' && (
                      <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',background:'#EFF6FF',borderRadius:8,marginBottom:8,fontSize:12,fontWeight:700,color:'#2563EB'}}>
                        🚗 Pickup Request · {u.pickupAddress || '—'}
                        {u.verifiedAt && <span style={{marginLeft:'auto',color:'#059669',fontWeight:600}}>✓ Collector Verified</span>}
                      </div>
                    )}

                    <div className="a-upload-top">
                      {(() => {
                        const allPhotos = [...new Set([u.photo, ...(u.photoUrls || [])].filter(p => typeof p === 'string' && p.startsWith('http')))]
                        return (
                          <div className="a-upload-photo"
                            style={{cursor: allPhotos.length ? 'zoom-in' : 'default'}}
                            onClick={() => allPhotos.length && openLightbox(allPhotos, 0)}>
                            {allPhotos.length
                              ? <img src={allPhotos[0]} alt="proof" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:8}}/>
                              : <span style={{fontSize:40}}>🥫</span>}
                            <div className="a-photo-overlay">
                              {allPhotos.length ? `📷 ${allPhotos.length} photo${allPhotos.length > 1 ? 's' : ''} · tap to view` : '📷 No photo'}
                            </div>
                          </div>
                        )
                      })()}
                      <div className="a-upload-info">
                        <div className="a-upload-user">{u.user}</div>
                        <div className="a-upload-meta">📍 {u.pickupType === 'pickup' ? (u.pickupAddress || 'Pickup') : (u.zone || '—')} · {u.city}</div>
                        <div className="a-upload-meta">🕐 {u.time}</div>
                        {/* Item types */}
                        {u.itemTypes.length > 0 && (
                          <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>
                            {u.itemTypes.map(id => (
                              <span key={id} style={{fontSize:11,fontWeight:600,background:'#F3F4F6',color:'#374151',padding:'2px 7px',borderRadius:20}}>
                                {ITEMS_EMOJI[id]} {ITEMS_CATALOG_NAMES[id] || id}
                              </span>
                            ))}
                            {u.weightRange && <span style={{fontSize:11,fontWeight:600,background:'#F3F4F6',color:'#374151',padding:'2px 7px',borderRadius:20}}>⚖️ {u.weightRange} kg</span>}
                          </div>
                        )}
                        <div className="a-cans-row" style={{marginTop:4}}>
                          <span className="a-cans-badge">{u.reported} items reported</span>
                          <span className={`a-risk ${u.risk >= 60 ? 'high' : u.risk >= 20 ? 'med' : 'low'}`}>Risk: {u.risk}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Collector verification section */}
                    {u.verifiedAt && u.collectorWeights && (
                      <div style={{background:'#F0FDF4',border:'1px solid #86EFAC',borderRadius:10,padding:'12px 14px',marginTop:10}}>
                        <div style={{fontSize:12,fontWeight:800,color:'#166534',marginBottom:8}}>✓ COLLECTOR VERIFICATION</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:8}}>
                          {Object.entries(u.collectorWeights).map(([id, kg]) => (
                            <div key={id} style={{background:'#DCFCE7',borderRadius:8,padding:'6px 10px',fontSize:12}}>
                              <span style={{fontWeight:700}}>{ITEMS_EMOJI[id]} {ITEMS_CATALOG_NAMES[id] || id}</span>
                              <span style={{color:'#166534',marginLeft:6}}>{kg} kg</span>
                              {u.collectorCounts?.[id] !== undefined && (
                                <span style={{color:'#166534',marginLeft:4}}>· {u.collectorCounts[id]} pcs</span>
                              )}
                            </div>
                          ))}
                        </div>
                        {u.collectorPhotos.length > 0 && (
                          <div style={{display:'flex',gap:6,overflowX:'auto'}}>
                            {u.collectorPhotos.map((url, i) => (
                              <img key={i} src={url} alt="collector proof"
                                style={{width:64,height:64,objectFit:'cover',borderRadius:8,flexShrink:0,cursor:'zoom-in'}}
                                onClick={() => openLightbox(u.collectorPhotos, i)}/>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* User photo strip — all photos, clickable lightbox */}
                    {(() => {
                      const allPhotos = [...new Set([u.photo, ...(u.photoUrls || [])].filter(p => typeof p === 'string' && p.startsWith('http')))]
                      if (allPhotos.length <= 1) return null
                      return (
                        <div style={{marginTop:8}}>
                          <div style={{fontSize:11,fontWeight:700,color:'var(--a-sub)',marginBottom:6}}>ALL PHOTOS ({allPhotos.length})</div>
                          <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:2}}>
                            {allPhotos.map((url, i) => (
                              <img key={i} src={url} alt="user proof"
                                style={{width:72,height:72,objectFit:'cover',borderRadius:8,flexShrink:0,cursor:'zoom-in',border:'2px solid transparent',transition:'border 0.15s'}}
                                onMouseEnter={e => e.currentTarget.style.border='2px solid #159A5B'}
                                onMouseLeave={e => e.currentTarget.style.border='2px solid transparent'}
                                onClick={() => openLightbox(allPhotos, i)}/>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                    <div className="a-upload-actions">
                      <button className="a-btn-approve" onClick={() => approveUpload(u.id)}>
                        <Check size={15}/> Approve
                      </button>
                      <button className="a-btn-reject" onClick={() => rejectUpload(u.id)}>
                        <X size={15}/> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── COLLECTORS ── */}
          {screen === SCREENS.COLLECTORS && (
            <div>
              <div className="a-page-hd">
                <div>
                  <div className="a-page-title">Collectors</div>
                  <div className="a-page-sub">{collectorsLoading ? 'Loading…' : `${activeColls} active · Managing Mumbai zones`}</div>
                </div>
                <button className="a-btn-primary sm" onClick={() => setShowAddCollector(true)}>
                  <Plus size={15}/> Add Collector
                </button>
              </div>

              {collectorsLoading && <div style={{textAlign:'center',padding:40,color:'var(--a-sub)'}}>Loading collectors…</div>}

              {!collectorsLoading && collectors.length === 0 && (
                <div className="a-empty">
                  <div style={{fontSize:48}}>🚛</div>
                  <div className="a-empty-title">No collectors yet</div>
                  <div className="a-empty-sub">Add your first collector to get started</div>
                </div>
              )}

              <div className="a-collector-grid">
                {collectors.map(c => (
                  <div key={c.id} className={`a-collector-card ${c.status}`}>
                    <div className="a-coll-top">
                      <div className="a-coll-avatar">{c.name[0]}</div>
                      <div className="a-coll-info">
                        <div className="a-coll-name">{c.name}</div>
                        <div className="a-coll-phone">{c.email}</div>
                        {c.phone && <div className="a-coll-phone" style={{color:'var(--a-green)'}}>📞 {c.phone}</div>}
                      </div>
                      <span className={`a-chip ${c.status}`}>{c.status}</span>
                    </div>
                    <div className="a-coll-zone">📍 {c.zone} · {c.radius_km}km radius</div>
                    <div className="a-coll-rate-row">
                      <span className="a-coll-rate-lbl">Rate</span>
                      <span className="a-coll-rate-val">₹{c.rate_per_kg}/kg</span>
                      <button className="a-rate-edit-btn" onClick={() => { setEditRateFor(c.id); setEditRateVal(String(c.rate_per_kg)) }}>Edit</button>
                    </div>
                    <div className="a-coll-stats">
                      <div className="a-cs"><div className="a-cs-v">{c.cans_today}</div><div className="a-cs-l">Cans Today</div></div>
                      <div className="a-cs"><div className="a-cs-v">{c.pickups_today}</div><div className="a-cs-l">Pickups</div></div>
                      <div className="a-cs"><div className="a-cs-v">₹{c.rate_per_kg}/kg</div><div className="a-cs-l">Rate</div></div>
                      <div className="a-cs"><div className="a-cs-v" style={{color:'#059669'}}>₹{calcAmount(c.cans_today, c.rate_per_kg)}</div><div className="a-cs-l">Owed Today</div></div>
                    </div>
                    <button className="a-btn-outline" onClick={() => toggleCollector(c)}>
                      {c.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Collector Modal */}
              {showAddCollector && (
                <div className="a-modal-overlay" onClick={() => setShowAddCollector(false)}>
                  <div className="a-modal" onClick={e => e.stopPropagation()}>
                    <div className="a-modal-title">Add New Collector</div>
                    <div style={{fontSize:12,color:'var(--a-sub)',marginBottom:16,background:'#FEF3C7',padding:'8px 12px',borderRadius:8}}>
                      ⚠️ After adding, also create their login in Supabase → Authentication → Users with the same email.
                    </div>
                    <div className="a-form-grid">
                      {[
                        { label:'Full Name',           key:'name',        type:'text',   ph:'Raju Sharma' },
                        { label:'Email (for login)',    key:'email',       type:'email',  ph:'raju@reloop.in' },
                        { label:'Phone (contact only)', key:'phone',       type:'tel',    ph:'+91 98200 00000' },
                        { label:'Zone / Area',          key:'zone',        type:'text',   ph:'Bandra West' },
                        { label:'Radius (km)',           key:'radius',      type:'number', ph:'4' },
                        { label:'Rate (₹/kg)',           key:'rate_per_kg', type:'number', ph:'120' },
                      ].map(f => (
                        <div key={f.key} className="a-form-row">
                          <label className="a-label">{f.label}</label>
                          <input className="a-input" type={f.type} placeholder={f.ph}
                            value={newCollector[f.key]}
                            onChange={e => setNewCollector(n => ({ ...n, [f.key]: e.target.value }))}/>
                        </div>
                      ))}
                    </div>
                    <div className="a-modal-actions">
                      <button className="a-btn-outline" onClick={() => setShowAddCollector(false)}>Cancel</button>
                      <button className="a-btn-primary sm" onClick={addCollector}>Add Collector</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edit Rate Modal (outside collectors section so it shows on top) */}
          {editRateFor && (
            <div className="a-modal-overlay" onClick={() => setEditRateFor(null)}>
              <div className="a-modal" style={{width:340}} onClick={e => e.stopPropagation()}>
                <div className="a-modal-title">Edit Collector Rate</div>
                <div className="a-form-row">
                  <label className="a-label">Rate per kg (₹)</label>
                  <input className="a-input" type="number" placeholder="e.g. 120" autoFocus
                    value={editRateVal} onChange={e => setEditRateVal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveCollectorRate()}/>
                </div>
                <div className="a-modal-actions">
                  <button className="a-btn-outline" style={{width:'auto',padding:'9px 20px'}} onClick={() => setEditRateFor(null)}>Cancel</button>
                  <button className="a-btn-primary sm" onClick={saveCollectorRate}>Save Rate</button>
                </div>
              </div>
            </div>
          )}

          {/* ── REWARDS ── */}
          {screen === SCREENS.REWARDS && (
            <div>
              <div className="a-page-hd">
                <div>
                  <div className="a-page-title">Rewards Catalog</div>
                  <div className="a-page-sub">{rewards.filter(r=>r.active).length} active · {rewards.filter(r=>!r.active).length} inactive</div>
                </div>
                <button className="a-btn-primary sm" onClick={() => setShowAddReward(true)}>
                  <Plus size={15}/> Add Reward
                </button>
              </div>
              <div className="a-rewards-table-wrap">
                <table className="a-table full">
                  <thead>
                    <tr><th>Reward</th><th>Category</th><th>Coins</th><th>Partner</th><th>Redeemed</th><th>Stock</th><th>Status</th><th>Toggle</th></tr>
                  </thead>
                  <tbody>
                    {rewards.map(r => (
                      <tr key={r.id} className={!r.active ? 'inactive-row' : ''}>
                        <td><div className="a-user-cell"><span style={{fontSize:20}}>{r.emoji}</span><span style={{fontWeight:600}}>{r.name}</span></div></td>
                        <td><span className="a-cat-chip">{r.category}</span></td>
                        <td><strong>{r.coins}</strong></td>
                        <td style={{color:'var(--a-sub)'}}>{r.partner || '—'}</td>
                        <td>{r.redeemed}</td>
                        <td>{r.stock ? `${r.redeemed}/${r.stock}` : '∞'}</td>
                        <td><span className={`a-chip ${r.active ? 'active' : 'inactive'}`}>{r.active ? 'Active' : 'Off'}</span></td>
                        <td>
                          <button className="a-toggle-btn" onClick={() => toggleReward(r.id)}>
                            {r.active ? <ToggleRight size={22} color="#159A5B"/> : <ToggleLeft size={22} color="#9CA3AF"/>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {showAddReward && (
                <div className="a-modal-overlay" onClick={() => setShowAddReward(false)}>
                  <div className="a-modal" onClick={e => e.stopPropagation()}>
                    <div className="a-modal-title">Add New Reward</div>
                    <div className="a-form-grid">
                      {[
                        { label:'Name',          key:'name',    type:'text',   ph:'Free Coffee' },
                        { label:'Emoji',         key:'emoji',   type:'text',   ph:'☕' },
                        { label:'Coins Needed',  key:'coins',   type:'number', ph:'60' },
                        { label:'Partner',       key:'partner', type:'text',   ph:'Brew & Beans' },
                        { label:'Coupon Code',   key:'coupon',  type:'text',   ph:'RELOOP-CF-0001' },
                        { label:'Stock (blank=unlimited)', key:'stock', type:'number', ph:'' },
                      ].map(f => (
                        <div key={f.key} className="a-form-row">
                          <label className="a-label">{f.label}</label>
                          <input className="a-input" type={f.type} placeholder={f.ph}
                            value={newReward[f.key]}
                            onChange={e => setNewReward(n => ({ ...n, [f.key]: e.target.value }))}/>
                        </div>
                      ))}
                      <div className="a-form-row">
                        <label className="a-label">Category</label>
                        <select className="a-input" value={newReward.category} onChange={e => setNewReward(n => ({ ...n, category: e.target.value }))}>
                          {['Food','Cafes','Shopping','Fun','Mystery'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="a-modal-actions">
                      <button className="a-btn-outline" onClick={() => setShowAddReward(false)}>Cancel</button>
                      <button className="a-btn-primary sm" onClick={addReward}>Add Reward</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DROP POINTS ── */}
          {screen === SCREENS.DROP_POINTS && (
            <div>
              <div className="a-page-hd">
                <div>
                  <div className="a-page-title">Drop Points</div>
                  <div className="a-page-sub">
                    {dpLoading ? 'Loading…' : `${dropPoints.filter(d=>d.status==='active').length} active · ${dropPoints.length} total`}
                  </div>
                </div>
                <button className="a-btn-primary sm" onClick={() => setShowAddDp(true)}>
                  <Plus size={15}/> Add Drop Point
                </button>
              </div>

              {/* Filters */}
              <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap',alignItems:'center'}}>
                <div className="a-search-wrap" style={{flex:1,minWidth:200}}>
                  <Search size={15}/>
                  <input className="a-search" placeholder="Search name or address…"
                    value={dpSearch} onChange={e => setDpSearch(e.target.value)}/>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {['All',...CITIES.slice(0,8)].map(c => (
                    <button key={c}
                      onClick={() => setDpCityFilter(c)}
                      style={{padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',
                        background: dpCityFilter===c ? 'var(--a-green)' : '#F3F4F6',
                        color: dpCityFilter===c ? '#fff' : 'var(--a-text)',
                        border: dpCityFilter===c ? 'none' : '1px solid var(--a-border)'}}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {dpLoading && <div style={{textAlign:'center',padding:40,color:'var(--a-sub)'}}>Loading…</div>}

              {!dpLoading && dropPoints.length === 0 && (
                <div className="a-empty">
                  <div style={{fontSize:48}}>📍</div>
                  <div className="a-empty-title">No drop points yet</div>
                  <div className="a-empty-sub">Add your first partner location</div>
                </div>
              )}

              <div className="a-collector-grid">
                {dropPoints
                  .filter(dp => {
                    const matchCity = dpCityFilter === 'All' || dp.city === dpCityFilter
                    const matchSearch = !dpSearch || dp.name.toLowerCase().includes(dpSearch.toLowerCase()) || (dp.address||'').toLowerCase().includes(dpSearch.toLowerCase())
                    return matchCity && matchSearch
                  })
                  .map(dp => (
                    <div key={dp.id} className={`a-collector-card ${dp.status}`} style={{position:'relative'}}>
                      <div className="a-coll-top">
                        <div className="a-coll-avatar"
                          style={{background: dp.bg_color || '#D1FAE5', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center'}}>
                          {dp.icon || '📍'}
                        </div>
                        <div className="a-coll-info">
                          <div className="a-coll-name">{dp.name}</div>
                          <div className="a-coll-phone" style={{display:'flex',alignItems:'center',gap:4}}>
                            <MapPin size={11}/> {dp.address || '—'}
                          </div>
                          <div className="a-coll-phone" style={{color:'#2563EB',fontWeight:600}}>📍 {dp.city}</div>
                        </div>
                        <span className={`a-chip ${dp.status}`}>{dp.status}</span>
                      </div>

                      {/* Tags */}
                      {dp.tags?.length > 0 && (
                        <div style={{display:'flex',flexWrap:'wrap',gap:4,margin:'10px 0 6px'}}>
                          {dp.tags.map((t,i) => (
                            <span key={i} style={{fontSize:11,fontWeight:600,background:'#F3F4F6',color:'#374151',padding:'2px 8px',borderRadius:20}}>{t}</span>
                          ))}
                        </div>
                      )}

                      <div style={{display:'flex',gap:8,marginTop:10}}>
                        <button className="a-btn-outline" style={{flex:1,fontSize:12}}
                          onClick={() => toggleDropPoint(dp)}>
                          {dp.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          style={{padding:'8px 12px',borderRadius:8,border:'1px solid #FEE2E2',background:'#FFF5F5',color:'#DC2626',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',gap:4}}
                          onClick={() => deleteDropPoint(dp.id)}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Add Drop Point Modal */}
              {showAddDp && (
                <div className="a-modal-overlay" onClick={() => setShowAddDp(false)}>
                  <div className="a-modal" style={{maxWidth:520}} onClick={e => e.stopPropagation()}>
                    <div className="a-modal-title">Add Drop Point</div>

                    <div className="a-form-grid">
                      <div className="a-form-row">
                        <label className="a-label">Name *</label>
                        <input className="a-input" placeholder="e.g. Brew & Beans Café" value={newDp.name}
                          onChange={e => setNewDp(n => ({ ...n, name: e.target.value }))}/>
                      </div>
                      <div className="a-form-row">
                        <label className="a-label">Address *</label>
                        <input className="a-input" placeholder="e.g. Linking Road, Bandra West" value={newDp.address}
                          onChange={e => setNewDp(n => ({ ...n, address: e.target.value }))}/>
                      </div>
                      <div className="a-form-row">
                        <label className="a-label">City *</label>
                        <select className="a-input" value={newDp.city}
                          onChange={e => setNewDp(n => ({ ...n, city: e.target.value }))}>
                          {CITIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>

                      {/* Icon picker */}
                      <div className="a-form-row">
                        <label className="a-label">Icon</label>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          {DP_ICONS.map(ico => (
                            <button key={ico} onClick={() => setNewDp(n => ({ ...n, icon: ico }))}
                              style={{width:38,height:38,fontSize:20,borderRadius:10,cursor:'pointer',
                                border: newDp.icon===ico ? '2px solid var(--a-green)' : '1px solid var(--a-border)',
                                background: newDp.icon===ico ? '#D1FAE5' : '#fff'}}>
                              {ico}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color picker */}
                      <div className="a-form-row">
                        <label className="a-label">Card Color</label>
                        <div style={{display:'flex',gap:8}}>
                          {DP_COLORS.map(col => (
                            <button key={col} onClick={() => setNewDp(n => ({ ...n, bg_color: col }))}
                              style={{width:28,height:28,borderRadius:8,background:col,cursor:'pointer',
                                border: newDp.bg_color===col ? '3px solid var(--a-green)' : '2px solid transparent',
                                outline: newDp.bg_color===col ? '2px solid var(--a-green)' : 'none'}}>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Material tags */}
                      <div className="a-form-row">
                        <label className="a-label">Accepted Materials</label>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          {MATERIAL_TAGS.map(tag => {
                            const on = newDp.tags.includes(tag)
                            return (
                              <button key={tag} onClick={() => setNewDp(n => ({
                                ...n, tags: on ? n.tags.filter(t=>t!==tag) : [...n.tags, tag]
                              }))}
                              style={{padding:'5px 11px',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',
                                background: on ? 'var(--a-green)' : '#F3F4F6',
                                color: on ? '#fff' : 'var(--a-text)',
                                border: on ? 'none' : '1px solid var(--a-border)'}}>
                                {tag}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div style={{marginTop:16,padding:'12px 16px',borderRadius:12,background:'#F9FAFB',border:'1px solid var(--a-border)'}}>
                      <div style={{fontSize:11,fontWeight:700,color:'var(--a-sub)',marginBottom:8}}>PREVIEW</div>
                      <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <div style={{width:44,height:44,borderRadius:12,background:newDp.bg_color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
                          {newDp.icon}
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:14}}>{newDp.name || 'Drop Point Name'}</div>
                          <div style={{fontSize:12,color:'var(--a-sub)'}}>{newDp.address || 'Address'} · {newDp.city}</div>
                          <div style={{display:'flex',gap:4,marginTop:4}}>
                            {newDp.tags.map(t=><span key={t} style={{fontSize:10,background:'#E5E7EB',borderRadius:20,padding:'1px 6px'}}>{t}</span>)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="a-modal-actions">
                      <button className="a-btn-outline" onClick={() => setShowAddDp(false)}>Cancel</button>
                      <button className="a-btn-primary sm" onClick={addDropPoint}
                        disabled={!newDp.name.trim() || !newDp.address.trim()}>
                        Add Drop Point
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SETTLEMENT ── */}
          {screen === SCREENS.SETTLEMENT && (
            <div>
              <div className="a-page-hd">
                <div>
                  <div className="a-page-title">EOD Settlement</div>
                  <div className="a-page-sub">Today · {new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</div>
                </div>
                <div className="a-settle-total">
                  Total Owed: <strong>₹{totalOwed.toLocaleString()}</strong>
                </div>
              </div>

              {settlement.length === 0 ? (
                <div className="a-empty">
                  <div style={{fontSize:48}}>📋</div>
                  <div className="a-empty-title">No collections today</div>
                  <div className="a-empty-sub">Settlement data appears here once collectors mark pickups as collected</div>
                </div>
              ) : (
                <div className="a-card">
                  <table className="a-table full">
                    <thead>
                      <tr><th>Collector</th><th>Cans</th><th>Weight (kg)</th><th>Pickups</th><th>Rate</th><th>Amount</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {settlement.map((s, i) => (
                        <tr key={i}>
                          <td><strong>{s.collector}</strong></td>
                          <td>{s.cans}</td>
                          <td style={{color:'var(--a-sub)'}}>{(s.cans * CAN_WEIGHT_KG).toFixed(2)} kg</td>
                          <td>{s.pickups}</td>
                          <td style={{color:'var(--a-sub)'}}>₹{s.rate_per_kg}/kg</td>
                          <td><strong style={{color:'#059669'}}>₹{s.amount}</strong></td>
                          <td><span className={`a-chip ${s.status === 'settled' ? 'active' : 'pending'}`}>{s.status === 'settled' ? 'Settled' : 'Pending'}</span></td>
                          <td>
                            {s.status === 'pending'
                              ? <button className="a-btn-primary sm" onClick={() => createSettlement(s.collector_id)}>Settle</button>
                              : <span style={{color:'#9CA3AF',fontSize:13}}>✓ Done</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="a-fraud-note">
                <AlertTriangle size={14}/> Fraud check: Collector-reported counts vs user-reported counts are compared per pickup. Mismatches flagged automatically.
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Toast */}
      {toast && <div className={`a-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={closeLightbox}>
          <button onClick={e => { e.stopPropagation(); closeLightbox() }}
            style={{position:'absolute',top:16,right:20,background:'none',border:'none',color:'#fff',fontSize:28,cursor:'pointer',lineHeight:1}}>✕</button>

          {lightbox.urls.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); lbPrev() }}
                style={{position:'absolute',left:16,background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:28,width:48,height:48,borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
              <button onClick={e => { e.stopPropagation(); lbNext() }}
                style={{position:'absolute',right:16,background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',fontSize:28,width:48,height:48,borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
            </>
          )}

          <img
            src={lightbox.urls[lightbox.idx]}
            alt="proof"
            onClick={e => e.stopPropagation()}
            style={{maxWidth:'90vw',maxHeight:'88vh',objectFit:'contain',borderRadius:12,boxShadow:'0 8px 48px rgba(0,0,0,0.6)'}}/>

          {lightbox.urls.length > 1 && (
            <div style={{position:'absolute',bottom:20,display:'flex',gap:8}}>
              {lightbox.urls.map((_, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setLightbox(l => ({...l, idx: i})) }}
                  style={{width:8,height:8,borderRadius:'50%',background: i === lightbox.idx ? '#fff' : 'rgba(255,255,255,0.35)',cursor:'pointer'}}/>
              ))}
            </div>
          )}

          <div style={{position:'absolute',bottom:20,right:20,color:'rgba(255,255,255,0.5)',fontSize:12}}>
            {lightbox.idx + 1} / {lightbox.urls.length}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
