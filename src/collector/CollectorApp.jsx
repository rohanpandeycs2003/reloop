import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { ArrowLeft, Check, MapPin, TrendingUp, Clock, CheckCircle, AlertCircle, Plus, Minus } from 'lucide-react'
import './collector.css'

const CAN_WEIGHT_KG = 0.015

const CS = { LOGIN:'login', HOME:'home', PICKUP:'pickup', EARNINGS:'earnings', VERIFY:'verify' }

const ITEMS_CATALOG = [
  { id:'cans',      emoji:'🥫', name:'Aluminium Cans',  countable:true  },
  { id:'bottles',   emoji:'🍺', name:'Beer Bottles',    countable:true  },
  { id:'cardboard', emoji:'📦', name:'Cardboard',       countable:false },
  { id:'paper',     emoji:'📄', name:'Paper',           countable:false },
  { id:'books',     emoji:'📚', name:'Books',           countable:false },
]

export default function CollectorApp() {
  // ── Auth state ────────────────────────────────────────────────
  const [authUser, setAuthUser]             = useState(null)
  const [collectorProfile, setCollectorProfile] = useState(null)
  const [authLoading, setAuthLoading]       = useState(true)

  // ── UI state ──────────────────────────────────────────────────
  const [screen, setScreen]       = useState(CS.LOGIN)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loginErr, setLoginErr]   = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [pickups, setPickups]     = useState([])
  const [pickupsLoading, setPickupsLoading] = useState(false)
  const [selected, setSelected]   = useState(null)
  const [actualCount, setActualCount] = useState('')
  const [proofPhoto, setProofPhoto]   = useState(null)
  const [toast, setToast]         = useState(null)
  const [activeTab, setActiveTab] = useState('requests')
  const [submitting, setSubmitting] = useState(false)

  // ── Pickup requests (user-submitted via app) ──────────────────
  const [pickupRequests, setPickupRequests] = useState([])
  const [reqLoading, setReqLoading]         = useState(false)

  // ── Verification state ────────────────────────────────────────
  const [verifySelected, setVerifySelected] = useState(null)
  const [verifyWeights, setVerifyWeights]   = useState({}) // { itemId: string }
  const [verifyCounts, setVerifyCounts]     = useState({}) // { itemId: string } — for countable
  const [verifyPhotos, setVerifyPhotos]     = useState({}) // { itemId: { file, preview } }
  const [verifyScale, setVerifyScale]       = useState({ file:null, preview:null })
  const [verifySubmitting, setVerifySubmitting] = useState(false)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  // ── Data loaders ──────────────────────────────────────────────
  const loadPickups = useCallback(async (collectorId) => {
    setPickupsLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('pickups')
      .select('*, users(name)')
      .eq('collector_id', collectorId)
      .gte('created_at', today + 'T00:00:00')
      .order('scheduled_time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    setPickupsLoading(false)
    if (error) { showToast('Failed to load pickups'); return }
    setPickups((data || []).map(p => ({
      id: p.id,
      user: p.users?.name || 'User',
      address: p.address || 'Address TBD',
      zone: p.zone || '',
      reported: p.reported_cans,
      actual: p.actual_cans ?? null,
      time: p.scheduled_time
        ? new Date(p.scheduled_time).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
        : '—',
      status: p.status,
      coins: p.reported_cans * 15,
      distance: '—',
    })))
  }, [])

  const loadPickupRequests = useCallback(async () => {
    setReqLoading(true)
    const { data } = await supabase
      .from('uploads')
      .select('*, users!user_id(name, city)')
      .eq('pickup_type', 'pickup')
      .in('status', ['pending'])
      .order('created_at', { ascending: true })
    setReqLoading(false)
    setPickupRequests(data || [])
  }, [])

  // ── Auth setup ────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user
      setAuthUser(u || null)
      if (u) {
        const collector = await fetchCollectorProfile(u)
        if (collector) {
          setCollectorProfile(collector)
          setScreen(CS.HOME)
          loadPickups(collector.id)
          loadPickupRequests()
        }
      }
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setAuthUser(null)
        setCollectorProfile(null)
        setPickups([])
        setPickupRequests([])
        setScreen(CS.LOGIN)
      }
    })
    return () => subscription.unsubscribe()
  }, [loadPickups, loadPickupRequests])

  const fetchCollectorProfile = async (u) => {
    const { data: byId } = await supabase
      .from('collectors').select('*').eq('auth_user_id', u.id).maybeSingle()
    if (byId) return byId

    const { data: byEmail } = await supabase
      .from('collectors').select('*').eq('email', u.email).maybeSingle()
    if (!byEmail) return null

    await supabase.from('collectors').update({ auth_user_id: u.id }).eq('id', byEmail.id)
    return { ...byEmail, auth_user_id: u.id }
  }

  // ── Auth actions ──────────────────────────────────────────────
  const signIn = async () => {
    if (!email || !password) return
    setLoginLoading(true)
    setLoginErr('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setLoginErr('Invalid email or password'); setLoginLoading(false); return }

    const u = data.user
    const collector = await fetchCollectorProfile(u)
    setLoginLoading(false)
    if (!collector) {
      await supabase.auth.signOut()
      setLoginErr('No collector profile found for this email')
      return
    }
    if (collector.status === 'inactive') {
      await supabase.auth.signOut()
      setLoginErr('Your account is inactive. Contact admin.')
      return
    }

    setAuthUser(u)
    setCollectorProfile(collector)
    setScreen(CS.HOME)
    loadPickups(collector.id)
    loadPickupRequests()
  }

  const signOut = async () => { await supabase.auth.signOut() }

  // ── Old pickup actions (admin-assigned) ───────────────────────
  const openPickup = (p) => {
    setSelected(p)
    setActualCount(String(p.reported))
    setProofPhoto(null)
    setScreen(CS.PICKUP)
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProofPhoto(URL.createObjectURL(file))
  }

  const markInTransit = async (id) => {
    await supabase.from('pickups').update({ status: 'in_transit' }).eq('id', id)
    setPickups(ps => ps.map(p => p.id === id ? { ...p, status: 'in_transit' } : p))
    showToast('Marked as on the way')
  }

  const markCollected = async () => {
    const count = Number(actualCount)
    if (!count || count < 0) return
    setSubmitting(true)
    const { error } = await supabase.from('pickups').update({
      status: 'collected',
      actual_cans: count,
      collected_at: new Date().toISOString(),
    }).eq('id', selected.id)
    setSubmitting(false)
    if (error) { showToast('Failed to save — try again'); return }
    setPickups(ps => ps.map(p => p.id === selected.id ? { ...p, status: 'collected', actual: count } : p))
    const name = selected.user
    setSelected(null)
    setScreen(CS.HOME)
    showToast(`✅ ${count} cans collected from ${name}`)
  }

  // ── New verification flow (user-submitted pickups) ─────────────
  const openVerify = (req) => {
    setVerifySelected(req)
    const initWeights = {}
    const initCounts = {}
    ;(req.item_types || []).forEach(id => {
      initWeights[id] = ''
      const item = ITEMS_CATALOG.find(x => x.id === id)
      if (item?.countable) initCounts[id] = ''
    })
    setVerifyWeights(initWeights)
    setVerifyCounts(initCounts)
    setVerifyPhotos({})
    setVerifyScale({ file: null, preview: null })
    setScreen(CS.VERIFY)
  }

  const submitVerification = async () => {
    if (!verifySelected) return
    setVerifySubmitting(true)

    // Upload category photos + scale photo
    const uploadedPhotos = []
    for (const [itemId, { file }] of Object.entries(verifyPhotos)) {
      if (!file) continue
      const ext = file.name?.split('.').pop() || 'jpg'
      const path = `collector/${authUser.id}/${Date.now()}-${itemId}.${ext}`
      const { error } = await supabase.storage.from('uploads').upload(path, file, { contentType: file.type, upsert: false })
      if (!error) {
        const { data } = supabase.storage.from('uploads').getPublicUrl(path)
        uploadedPhotos.push(data.publicUrl)
      }
    }
    if (verifyScale.file) {
      const ext = verifyScale.file.name?.split('.').pop() || 'jpg'
      const path = `collector/${authUser.id}/${Date.now()}-scale.${ext}`
      const { error } = await supabase.storage.from('uploads').upload(path, verifyScale.file, { contentType: verifyScale.file.type, upsert: false })
      if (!error) {
        const { data } = supabase.storage.from('uploads').getPublicUrl(path)
        uploadedPhotos.push(data.publicUrl)
      }
    }

    // Build weight + count objects
    const weightsObj = {}
    const countsObj = {}
    for (const [id, val] of Object.entries(verifyWeights)) {
      if (val !== '') weightsObj[id] = parseFloat(val) || 0
    }
    for (const [id, val] of Object.entries(verifyCounts)) {
      if (val !== '') countsObj[id] = parseInt(val) || 0
    }

    const { error } = await supabase.from('uploads').update({
      collector_weights: weightsObj,
      collector_counts: countsObj,
      collector_photos: uploadedPhotos,
      verified_at: new Date().toISOString(),
      verified_by: authUser.id,
    }).eq('id', verifySelected.id)

    setVerifySubmitting(false)
    if (error) { showToast('Submit failed — ' + error.message); return }

    setPickupRequests(prev => prev.filter(r => r.id !== verifySelected.id))
    setVerifySelected(null)
    setScreen(CS.HOME)
    showToast('✅ Verification submitted to admin')
  }

  const verifyReady = () => {
    if (!verifySelected) return false
    const items = verifySelected.item_types || []
    for (const id of items) {
      if (!verifyWeights[id]?.trim()) return false
      if (!verifyPhotos[id]?.preview) return false
    }
    return !!verifyScale.preview
  }

  // ── Derived stats ─────────────────────────────────────────────
  const pending   = pickups.filter(p => p.status === 'pending')
  const inTransit = pickups.filter(p => p.status === 'in_transit')
  const collected = pickups.filter(p => p.status === 'collected')
  const totalActual   = collected.reduce((s, p) => s + (p.actual || 0), 0)
  const totalKg       = +(totalActual * CAN_WEIGHT_KG).toFixed(2)
  const rate          = collectorProfile?.rate_per_kg || 120
  const totalEarnings = Math.round(totalKg * rate)

  // ── Loading splash ────────────────────────────────────────────
  if (authLoading) return (
    <div className="col-screen" style={{alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:28,fontWeight:800}}><span style={{color:'#159A5B'}}>re</span>loop</div>
        <div style={{fontSize:13,color:'#9CA3AF',marginTop:8}}>Loading…</div>
      </div>
    </div>
  )

  // ── Login ─────────────────────────────────────────────────────
  if (screen === CS.LOGIN) return (
    <div className="col-screen">
      <div className="col-login">
        <div className="col-brand"><span className="col-green">re</span>loop</div>
        <div className="col-login-tag">Collector Portal</div>
        <div className="col-login-h1">Sign in to start your day</div>
        <div className="col-form">
          <div className="col-float-field">
            <input type="email" placeholder=" " className={loginErr ? 'err' : ''}
              value={email} onChange={e => { setEmail(e.target.value); setLoginErr('') }}
              onKeyDown={e => e.key === 'Enter' && signIn()}/>
            <label>Email Address</label>
          </div>
          <div className="col-float-field">
            <input type="password" placeholder=" " className={loginErr ? 'err' : ''}
              value={password} onChange={e => { setPassword(e.target.value); setLoginErr('') }}
              onKeyDown={e => e.key === 'Enter' && signIn()}/>
            <label>Password</label>
          </div>
          {loginErr && <div className="col-err">{loginErr}</div>}
          <button className="col-btn-g" onClick={signIn} disabled={loginLoading}>
            {loginLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Verify Screen (user-submitted pickup request) ─────────────
  if (screen === CS.VERIFY && verifySelected) {
    const items = (verifySelected.item_types || [])
      .map(id => ITEMS_CATALOG.find(x => x.id === id))
      .filter(Boolean)
    const user = verifySelected.users?.name || 'User'
    const addr = verifySelected.pickup_address || '—'
    const canSubmit = verifyReady()

    const setItemPhoto = (itemId, file) => {
      const reader = new FileReader()
      reader.onload = ev => setVerifyPhotos(prev => ({
        ...prev, [itemId]: { file, preview: ev.target.result }
      }))
      reader.readAsDataURL(file)
    }
    const setScalePhoto = (file) => {
      const reader = new FileReader()
      reader.onload = ev => setVerifyScale({ file, preview: ev.target.result })
      reader.readAsDataURL(file)
    }

    return (
      <div className="col-screen">
        <div className="col-scroll">
          <div className="col-header">
            <button className="col-back" onClick={() => { setScreen(CS.HOME); setVerifySelected(null) }}><ArrowLeft size={18}/></button>
            <div>
              <div className="col-hd-title">Verify Pickup</div>
              <div className="col-hd-sub">{user}</div>
            </div>
          </div>

          {/* Address */}
          <div style={{margin:'0 16px 16px',background:'#EFF6FF',borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'flex-start',gap:10}}>
            <MapPin size={16} color="#2563EB" style={{flexShrink:0,marginTop:2}}/>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#1D4ED8'}}>Pickup Address</div>
              <div style={{fontSize:13,color:'#374151',marginTop:2}}>{addr}</div>
            </div>
          </div>

          {/* Per-item verification cards */}
          <div style={{padding:'0 16px',display:'flex',flexDirection:'column',gap:14,marginBottom:16}}>
            {items.map(item => (
              <div key={item.id} style={{background:'#fff',borderRadius:16,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                  <span style={{fontSize:22}}>{item.emoji}</span>
                  <span style={{fontSize:15,fontWeight:800,color:'#111'}}>{item.name}</span>
                  {verifyWeights[item.id] && verifyPhotos[item.id]?.preview && (
                    <CheckCircle size={16} color="#059669" style={{marginLeft:'auto'}}/>
                  )}
                </div>

                {/* Weight input */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#6B7280',marginBottom:6}}>WEIGHT (kg)</div>
                  <input
                    type="number" inputMode="decimal" placeholder="e.g. 2.5"
                    value={verifyWeights[item.id] || ''}
                    onChange={e => setVerifyWeights(prev => ({ ...prev, [item.id]: e.target.value }))}
                    style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #E5E7EB',fontSize:15,fontWeight:600,boxSizing:'border-box'}}/>
                </div>

                {/* Count input — only for countable items */}
                {item.countable && (
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#6B7280',marginBottom:6}}>COUNT</div>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <button
                        style={{width:36,height:36,borderRadius:10,border:'1.5px solid #E5E7EB',background:'#F9FAFB',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                        onClick={() => setVerifyCounts(prev => ({ ...prev, [item.id]: String(Math.max(0, Number(prev[item.id]||0) - 1)) }))}>
                        <Minus size={16}/>
                      </button>
                      <input
                        type="number" inputMode="numeric" placeholder="0"
                        value={verifyCounts[item.id] || ''}
                        onChange={e => setVerifyCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                        style={{flex:1,padding:'10px 14px',borderRadius:10,border:'1.5px solid #E5E7EB',fontSize:15,fontWeight:600,textAlign:'center'}}/>
                      <button
                        style={{width:36,height:36,borderRadius:10,border:'1.5px solid #E5E7EB',background:'#F9FAFB',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}
                        onClick={() => setVerifyCounts(prev => ({ ...prev, [item.id]: String(Number(prev[item.id]||0) + 1) }))}>
                        <Plus size={16}/>
                      </button>
                    </div>
                  </div>
                )}

                {/* Photo per item */}
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'#6B7280',marginBottom:6}}>PHOTO PROOF *</div>
                  <label style={{display:'block',cursor:'pointer'}}>
                    <input type="file" accept="image/*" capture="environment" style={{display:'none'}}
                      onChange={e => { const f = e.target.files?.[0]; if (f) setItemPhoto(item.id, f) }}/>
                    {verifyPhotos[item.id]?.preview
                      ? <div style={{height:90,borderRadius:12,overflow:'hidden',position:'relative'}}>
                          <img src={verifyPhotos[item.id].preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          <div style={{position:'absolute',bottom:6,right:6,background:'rgba(0,0,0,.55)',borderRadius:6,padding:'3px 8px',fontSize:11,color:'#fff',fontWeight:600}}>Tap to retake</div>
                        </div>
                      : <div style={{height:90,borderRadius:12,border:'2px dashed #D1D5DB',background:'#F9FAFB',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
                          <span style={{fontSize:24}}>📷</span>
                          <span style={{fontSize:12,color:'#9CA3AF',fontWeight:600}}>Tap to take photo</span>
                        </div>
                    }
                  </label>
                </div>
              </div>
            ))}

            {/* Weighing scale photo */}
            <div style={{background:'#fff',borderRadius:16,padding:'16px',boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                <span style={{fontSize:22}}>⚖️</span>
                <span style={{fontSize:15,fontWeight:800,color:'#111'}}>Weighing Scale Photo</span>
                <span style={{marginLeft:'auto',fontSize:11,fontWeight:700,background:'#FEE2E2',color:'#DC2626',padding:'2px 8px',borderRadius:20}}>Required</span>
              </div>
              <div style={{fontSize:12,color:'#6B7280',marginBottom:10}}>Take a clear photo of the scale showing total/combined weight</div>
              <label style={{display:'block',cursor:'pointer'}}>
                <input type="file" accept="image/*" capture="environment" style={{display:'none'}}
                  onChange={e => { const f = e.target.files?.[0]; if (f) setScalePhoto(f) }}/>
                {verifyScale.preview
                  ? <div style={{height:110,borderRadius:12,overflow:'hidden',position:'relative'}}>
                      <img src={verifyScale.preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      <div style={{position:'absolute',bottom:6,right:6,background:'rgba(0,0,0,.55)',borderRadius:6,padding:'3px 8px',fontSize:11,color:'#fff',fontWeight:600}}>Tap to retake</div>
                    </div>
                  : <div style={{height:110,borderRadius:12,border:'2px dashed #D1D5DB',background:'#F9FAFB',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
                      <span style={{fontSize:32}}>⚖️</span>
                      <span style={{fontSize:13,color:'#9CA3AF',fontWeight:600}}>Tap to take scale photo</span>
                    </div>
                }
              </label>
            </div>
          </div>

          <div style={{padding:'0 16px 32px'}}>
            <button className="col-btn-g full"
              style={{width:'100%',opacity:canSubmit&&!verifySubmitting?1:0.45}}
              onClick={submitVerification}
              disabled={!canSubmit || verifySubmitting}>
              <Check size={17}/> {verifySubmitting ? 'Submitting…' : 'Submit Verification'}
            </button>
            {!canSubmit && (
              <div style={{fontSize:12,color:'#9CA3AF',textAlign:'center',marginTop:8}}>
                Fill weight + photo for every item, plus scale photo
              </div>
            )}
          </div>
        </div>
        {toast && <div className="col-toast">{toast}</div>}
      </div>
    )
  }

  // ── Pickup Detail (admin-assigned) ────────────────────────────
  if (screen === CS.PICKUP && selected) {
    const mismatch = Number(actualCount) !== selected.reported && Number(actualCount) > 0
    return (
      <div className="col-screen">
        <div className="col-scroll">
          <div className="col-header">
            <button className="col-back" onClick={() => { setScreen(CS.HOME); setSelected(null) }}><ArrowLeft size={18}/></button>
            <div>
              <div className="col-hd-title">Pickup Details</div>
              <div className="col-hd-sub">{selected.user}</div>
            </div>
          </div>

          <div className="col-pickup-hero">
            <div className="col-pu-emoji">🥫</div>
            <div className="col-pu-user">{selected.user}</div>
            <div className="col-pu-addr"><MapPin size={13}/> {selected.address}</div>
          </div>

          <div className="col-info-card">
            <div className="col-info-row"><span>Reported by user</span><strong>{selected.reported} cans</strong></div>
            <div className="col-info-row"><span>Scheduled time</span><strong>{selected.time}</strong></div>
            <div className="col-info-row"><span>GreenCoins at stake</span><strong style={{color:'#159A5B'}}>{selected.coins} 🟢</strong></div>
          </div>

          <div className="col-count-section">
            <div className="col-count-lbl">Enter actual cans collected</div>
            <div className="col-count-ctrl">
              <button className="col-count-btn" onClick={() => setActualCount(n => String(Math.max(0, Number(n) - 1)))}>−</button>
              <input className="col-count-num" type="number" value={actualCount}
                onChange={e => setActualCount(e.target.value)}/>
              <button className="col-count-btn" onClick={() => setActualCount(n => String(Number(n) + 1))}>+</button>
            </div>
            {mismatch && <div className="col-mismatch"><AlertCircle size={14}/> Count differs from user report ({selected.reported}). Admin will review.</div>}
            {!mismatch && Number(actualCount) > 0 && <div className="col-match"><CheckCircle size={14}/> Matches user report</div>}
          </div>

          <div className="col-proof-section">
            <div className="col-proof-lbl">📸 Photo Proof <span className="col-proof-req">Required</span></div>
            {proofPhoto
              ? <div className="col-proof-preview">
                  <img src={proofPhoto} alt="proof" className="col-proof-img"/>
                  <button className="col-proof-retake" onClick={() => setProofPhoto(null)}>Retake</button>
                </div>
              : <label className="col-proof-upload">
                  <input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handlePhotoUpload}/>
                  <div className="col-proof-placeholder">
                    <span className="col-proof-icon">📷</span>
                    <span>Tap to take photo</span>
                    <span className="col-proof-sub">Camera opens automatically</span>
                  </div>
                </label>
            }
          </div>

          <button className="col-btn-g full"
            style={{margin:'0 20px',width:'calc(100% - 40px)',opacity:(proofPhoto && !submitting) ? 1 : 0.45}}
            onClick={markCollected} disabled={!proofPhoto || submitting}>
            <Check size={17}/> {submitting ? 'Saving…' : 'Mark as Collected'}
          </button>
        </div>
      </div>
    )
  }

  // ── Home ──────────────────────────────────────────────────────
  if (screen === CS.HOME) return (
    <div className="col-screen">
      <div className="col-scroll">
        <div className="col-home-header">
          <div>
            <div className="col-brand-sm"><span className="col-green">re</span>loop</div>
            <div className="col-welcome">Hey, {collectorProfile?.name?.split(' ')[0] || 'Collector'} 👋</div>
            <div className="col-zone-tag">
              <MapPin size={11}/> {collectorProfile?.zone || '—'} · {collectorProfile?.radius_km || '—'}km zone
            </div>
          </div>
          <button className="col-earn-btn" onClick={() => setScreen(CS.EARNINGS)}>
            <TrendingUp size={15}/> Summary
          </button>
        </div>

        <div className="col-today-card">
          <div className="col-today-row">
            <div className="col-td">
              <div className="col-td-v">{collected.length}/{pickups.length || 0}</div>
              <div className="col-td-l">Assigned Done</div>
            </div>
            <div className="col-td">
              <div className="col-td-v">{pickupRequests.length}</div>
              <div className="col-td-l">User Requests</div>
            </div>
            <div className="col-td">
              <div className="col-td-v">₹{totalEarnings}</div>
              <div className="col-td-l">Payable Today</div>
            </div>
          </div>
        </div>

        <div className="col-tabs">
          {[
            { id:'requests', label:`Requests (${pickupRequests.length})` },
            { id:'pending',  label:`Assigned (${pending.length + inTransit.length})` },
            { id:'done',     label:`Done (${collected.length})` },
          ].map(t => (
            <button key={t.id} className={`col-tab ${activeTab === t.id ? 'on' : ''}`}
              onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="col-pickup-list">

          {/* ── User-submitted pickup requests ── */}
          {activeTab === 'requests' && (
            <>
              {reqLoading && <div style={{textAlign:'center',padding:32,color:'#9CA3AF'}}>Loading requests…</div>}
              {!reqLoading && pickupRequests.length === 0 && (
                <div style={{textAlign:'center',padding:32,color:'#9CA3AF'}}>
                  <div style={{fontSize:40,marginBottom:8}}>📭</div>
                  <div style={{fontWeight:600}}>No pickup requests</div>
                  <div style={{fontSize:13,marginTop:4}}>Users can request pickups from the app</div>
                </div>
              )}
              {!reqLoading && pickupRequests.map(req => {
                const items = (req.item_types || []).map(id => ITEMS_CATALOG.find(x => x.id === id)).filter(Boolean)
                return (
                  <div key={req.id} className="col-pu-card" style={{border:'1.5px solid #BFDBFE'}}>
                    <div className="col-pu-top">
                      <div className="col-pu-avatar" style={{background:'#DBEAFE',color:'#2563EB'}}>
                        {(req.users?.name || 'U')[0]}
                      </div>
                      <div className="col-pu-info">
                        <div className="col-pu-name">{req.users?.name || 'User'}</div>
                        <div className="col-pu-address" style={{display:'flex',alignItems:'center',gap:4}}>
                          <MapPin size={11}/> {req.pickup_address || '—'}
                        </div>
                        <div className="col-pu-meta" style={{flexWrap:'wrap',gap:4}}>
                          {items.map(item => (
                            <span key={item.id} className="col-cans-tag" style={{background:'#EFF6FF',color:'#2563EB'}}>
                              {item.emoji} {item.name}
                            </span>
                          ))}
                          {req.estimated_weight_range && (
                            <span className="col-cans-tag">⚖️ {req.estimated_weight_range} kg</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="col-pu-actions">
                      <span style={{fontSize:12,color:'#9CA3AF'}}>
                        {new Date(req.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                      </span>
                      <button className="col-btn-g sm" onClick={() => openVerify(req)}>
                        Verify & Collect <ArrowLeft size={13} style={{transform:'rotate(180deg)'}}/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* ── Admin-assigned pickups ── */}
          {activeTab === 'pending' && (
            <>
              {pickupsLoading && <div style={{textAlign:'center',padding:32,color:'#9CA3AF'}}>Loading pickups…</div>}
              {!pickupsLoading && [...inTransit, ...pending].length === 0 && (
                <div style={{textAlign:'center',padding:32,color:'#9CA3AF'}}>
                  <div style={{fontSize:40,marginBottom:8}}>📭</div>
                  <div style={{fontWeight:600}}>No assigned pickups today</div>
                  <div style={{fontSize:13,marginTop:4}}>Admin assigns pickups from the dashboard</div>
                </div>
              )}
              {!pickupsLoading && [...inTransit, ...pending].map(p => (
                <div key={p.id} className={`col-pu-card ${p.status === 'in_transit' ? 'transit' : ''}`}>
                  <div className="col-pu-top">
                    <div className="col-pu-avatar">{p.user[0]}</div>
                    <div className="col-pu-info">
                      <div className="col-pu-name">{p.user}</div>
                      <div className="col-pu-address"><MapPin size={11}/> {p.address}</div>
                      <div className="col-pu-meta">
                        <span><Clock size={11}/> {p.time}</span>
                        <span className="col-cans-tag">{p.reported} cans</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-pu-actions">
                    {p.status === 'pending' && (
                      <button className="col-btn-o sm" onClick={() => markInTransit(p.id)}>On My Way</button>
                    )}
                    {p.status === 'in_transit' && <span className="col-transit-tag">🚛 On the way</span>}
                    <button className="col-btn-g sm" onClick={() => openPickup(p)}>
                      Collect <ArrowLeft size={13} style={{transform:'rotate(180deg)'}}/>
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── Collected ── */}
          {activeTab === 'done' && (
            <>
              {collected.length === 0 && (
                <div style={{textAlign:'center',padding:32,color:'#9CA3AF'}}>
                  <div style={{fontSize:40,marginBottom:8}}>🥫</div>
                  <div style={{fontWeight:600}}>No collections yet today</div>
                </div>
              )}
              {collected.map(p => (
                <div key={p.id} className="col-pu-card done">
                  <div className="col-pu-top">
                    <div className="col-pu-avatar done">{p.user[0]}</div>
                    <div className="col-pu-info">
                      <div className="col-pu-name">{p.user}</div>
                      <div className="col-pu-address"><MapPin size={11}/> {p.address}</div>
                      <div className="col-pu-meta">
                        <span className="col-cans-tag done">{p.actual} cans collected</span>
                        {p.actual !== p.reported && <span className="col-mismatch-tag">⚠️ Mismatch: reported {p.reported}</span>}
                      </div>
                    </div>
                    <div className="col-done-check">✓</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <button className="col-btn-o" style={{margin:'12px 20px',width:'calc(100% - 40px)',fontSize:13}} onClick={signOut}>
          Sign Out
        </button>
      </div>
      {toast && <div className="col-toast">{toast}</div>}
    </div>
  )

  // ── Earnings ──────────────────────────────────────────────────
  if (screen === CS.EARNINGS) return (
    <div className="col-screen">
      <div className="col-scroll">
        <div className="col-header">
          <button className="col-back" onClick={() => setScreen(CS.HOME)}><ArrowLeft size={18}/></button>
          <div>
            <div className="col-hd-title">Today's Summary</div>
            <div className="col-hd-sub">{new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long' })}</div>
          </div>
        </div>

        <div className="col-earn-hero">
          <div className="col-earn-lbl">Total Payable to Reloop</div>
          <div className="col-earn-val">₹{totalEarnings}</div>
          <div className="col-earn-sub">@ ₹{rate}/kg · {totalKg} kg ({totalActual} cans)</div>
        </div>

        <div className="col-earn-stats">
          {[
            { v: collected.length,    l:'Pickups Completed' },
            { v: `${totalKg} kg`,     l:'Total Weight' },
            { v: `₹${totalEarnings}`, l:'Due to Reloop' },
            { v: collected.filter(p => p.actual !== p.reported).length || '0', l:'Mismatches' },
          ].map((s, i) => (
            <div key={i} className="col-es">
              <div className="col-es-v">{s.v}</div>
              <div className="col-es-l">{s.l}</div>
            </div>
          ))}
        </div>

        {collected.length > 0 && (
          <>
            <div className="col-section-hd">Breakdown</div>
            <div className="col-earn-list">
              {collected.map(p => (
                <div key={p.id} className="col-earn-row">
                  <div className="col-er-left">
                    <div className="col-er-user">{p.user}</div>
                    <div className="col-er-addr">{p.address}</div>
                  </div>
                  <div className="col-er-right">
                    <div className="col-er-cans">{p.actual} cans · {+((p.actual || 0) * CAN_WEIGHT_KG).toFixed(3)} kg</div>
                    <div className="col-er-amt">₹{Math.round((p.actual || 0) * CAN_WEIGHT_KG * rate)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="col-settle-note">
          💡 Payment collected by Reloop at EOD. Questions? <strong>support@reloop.in</strong>
        </div>
      </div>
      {toast && <div className="col-toast">{toast}</div>}
    </div>
  )

  return null
}
