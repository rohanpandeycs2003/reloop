import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase.js'
import { estimateReward, calculateCO2Saved } from './lib/greencoins.js'
import {
  Home, Upload, Gift, Trophy, User, Bell, ArrowLeft,
  Plus, Minus, ChevronRight, Check, Copy, X,
  Share2, MapPin, Navigation
} from 'lucide-react'

// ── Screen IDs ──────────────────────────────────────────────
const S = {
  SPLASH:'splash', ONBOARD:'onboard', LOGIN:'login',
  USER_TYPE:'user_type', BUSINESS_SOON:'business_soon',
  SETUP_PROFILE:'setup_profile',
  HOME:'home', UPLOAD:'upload', REWARDS:'rewards',
  LEADERBOARD:'leaderboard', PROFILE:'profile',
  DROP_POINTS:'drop_points', CHALLENGES:'challenges',
  ACTIVITY:'activity', REFERRAL:'referral', BADGES:'badges',
  SETTINGS:'settings', HELP:'help', EDIT_PROFILE:'edit_profile',
  NOTIFICATIONS:'notifications',
}

const EMOJI_POOL = ['🦊','🐼','🦁','🐯','🐨','🦝','🐸','🦋','🦅','🌻','⭐','🚀','💎','🔥','🌊','🎯','🧁','🎸','🏄','🦄']
const CITIES = ['Mumbai','Delhi','Bangalore','Hyderabad','Chennai','Kolkata','Pune','Ahmedabad','Jaipur','Surat','Lucknow','Kanpur','Nagpur','Indore','Thane','Bhopal','Patna','Vadodara','Ghaziabad','Noida']

// ── Static / catalog data (mock until we add catalog screens to DB) ──
const ONBOARDS = [
  { em:'🥫', color:'#159A5B', bg:'#D1FAE5',
    title:'Turn Waste Into Rewards',
    desc:'Collect your aluminium cans and drop them at a nearby ReLoop partner. Every can counts.' },
  { em:'🟢', color:'#D97706', bg:'#FEF3C7',
    title:'Drop Cans. Earn GreenCoins.',
    desc:'Each can you drop earns GreenCoins instantly. No scanning, no hassle — just drop and earn.' },
  { em:'🎁', color:'#2563EB', bg:'#DBEAFE',
    title:'Redeem Rewards & Discounts',
    desc:'Spend your GreenCoins on free coffee, Blinkit credits, gym discounts, movie tickets and more.' },
]

const REWARDS_DATA = {
  All: [
    { em:'☕', name:'Free Coffee',         coins:60,  bg:'#FEF3C7', code:'RELOOP-CF-7731' },
    { em:'🍕', name:"Domino's ₹100 Off",  coins:120, bg:'#FEE2E2', code:'RELOOP-DM-4829' },
    { em:'🎬', name:'Movie Ticket ₹200',  coins:180, bg:'#F3E8FF', code:'RELOOP-MV-3391' },
    { em:'🛍️', name:'Myntra ₹150',        coins:200, bg:'#EDE9FE', code:'RELOOP-MN-9203' },
    { em:'🏋️', name:'Gym Day Pass',        coins:100, bg:'#DBEAFE', code:'RELOOP-GM-6612' },
    { em:'🎵', name:'Spotify 1 Month',     coins:150, bg:'#FCE7F3', code:'RELOOP-SP-8820' },
    { em:'📦', name:'Mystery Box 🎲',      coins:75,  bg:'#FEF9C3', code:'RELOOP-MB-????', mystery:true },
  ],
  Food:    [{ em:'🍕', name:"Domino's ₹100 Off", coins:120, bg:'#FEE2E2', code:'RELOOP-DM-4829' }],
  Cafes:   [{ em:'☕', name:'Free Coffee',         coins:60,  bg:'#FEF3C7', code:'RELOOP-CF-7731' }],
  Shopping:[{ em:'🛍️', name:'Myntra ₹150',        coins:200, bg:'#EDE9FE', code:'RELOOP-MN-9203' }],
  Fun:     [{ em:'🎬', name:'Movie Ticket ₹200',  coins:180, bg:'#F3E8FF', code:'RELOOP-MV-3391' },
            { em:'🎵', name:'Spotify 1 Month',     coins:150, bg:'#FCE7F3', code:'RELOOP-SP-8820' }],
  Mystery: [{ em:'📦', name:'Mystery Box 🎲',      coins:75,  bg:'#FEF9C3', code:'RELOOP-MB-????', mystery:true }],
}

const LB_ROWS = [
  { rank:4, name:'Arjun M.',  city:'Mumbai', pts:3210, badge:'🥈' },
  { rank:5, name:'Divya P.',  city:'Mumbai', pts:2840, badge:'🌟', me:true },
  { rank:6, name:'Priya S.',  city:'Pune',   pts:2650, badge:'🌿' },
  { rank:7, name:'Rahul K.',  city:'Mumbai', pts:2400, badge:'🌿' },
  { rank:8, name:'Neha R.',   city:'Delhi',  pts:2100, badge:'🌿' },
]

const DROP_POINTS_MOCK = [
  { ico:'☕', name:'Brew & Beans Café',   addr:'Bandra West, Mumbai',   tags:['Cans','Plastic'],             dist:'0.4 km', bg:'#FEF3C7' },
  { ico:'🏋️', name:'FitZone Gym',         addr:'Andheri East, Mumbai',  tags:['Cans','E-Waste'],             dist:'1.1 km', bg:'#DBEAFE' },
  { ico:'🎓', name:'NM College',          addr:'Vile Parle, Mumbai',    tags:['All Materials'],              dist:'1.8 km', bg:'#F3E8FF' },
  { ico:'🏪', name:'D-Mart Partner',      addr:'Goregaon West, Mumbai', tags:['Cans','Plastic','Cardboard'], dist:'2.3 km', bg:'#D1FAE5' },
  { ico:'🏢', name:'Hiranandani Society', addr:'Powai, Mumbai',         tags:['Cans','Plastic'],             dist:'3.1 km', bg:'#FCE7F3' },
]

const CHALLENGES = [
  { ico:'🥤', name:'Can Crusher Week',   sponsor:'Sponsored by Red Bull India', prog:7,    total:10,   reward:150, bg:'#FEE2E2' },
  { ico:'🌊', name:'Plastic-Free Month', sponsor:'Sponsored by Bisleri',        prog:4,    total:15,   reward:300, bg:'#DBEAFE' },
  { ico:'🏙️', name:'City Champion',      sponsor:'Reloop Challenge',            prog:2840, total:5000, reward:500, bg:'#D1FAE5' },
  { ico:'👥', name:'Squad Goals',        sponsor:'Refer 3 friends',             prog:1,    total:3,    reward:200, bg:'#FEF3C7' },
]

const BADGES_DATA = [
  { ico:'🌱', name:'Loop Starter',  desc:'Dropped your first can',    earned:true  },
  { ico:'🔥', name:'7-Day Streak',  desc:'7 consecutive days',         earned:true  },
  { ico:'🥫', name:'Can Collector', desc:'Recycled 50+ cans',          earned:true  },
  { ico:'💪', name:'Eco Grinder',   desc:'Recycled 100+ cans',         earned:true  },
  { ico:'👑', name:'ReLoop OG',     desc:'One of the first 100 users', earned:false },
  { ico:'🏆', name:'City Champion', desc:'Reach #1 in your city',      earned:false },
  { ico:'🌍', name:'ReLoop Legend', desc:'Recycle 2000+ cans',         earned:false },
  { ico:'🤝', name:'Squad Goals',   desc:'Refer 10 friends',           earned:false },
]

const NEXT_REWARD_STATIC = { em:'☕', name:'Free Coffee', coins:60 }

const ITEMS_CATALOG = [
  { id:'cans',      emoji:'🥫', name:'Aluminium Cans',  color:'#D1FAE5', countable:true },
  { id:'bottles',   emoji:'🍺', name:'Beer Bottles',    color:'#FEF3C7', countable:true },
  { id:'cardboard', emoji:'📦', name:'Cardboard',       color:'#FEF9C3', countable:false },
  { id:'paper',     emoji:'📄', name:'Paper',           color:'#F3E8FF', countable:false },
  { id:'books',     emoji:'📚', name:'Books',           color:'#FCE7F3', countable:false },
]

const WEIGHT_RANGES = [
  { label:'0 – 10 kg',  value:'0-10',  sub:'Light bag' },
  { label:'10 – 30 kg', value:'10-30', sub:'Medium load' },
  { label:'30 – 50 kg', value:'30-50', sub:'Heavy load' },
  { label:'50+ kg',     value:'50+',   sub:'Bulk / Commercial' },
]

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  // Restore phone-frame styles (overrides admin.css !important leakage)
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) {
      root.style.setProperty('width', 'min(393px, 100vw)', 'important')
      root.style.setProperty('max-width', 'min(393px, 100vw)', 'important')
      root.style.setProperty('height', 'min(852px, 100dvh)', 'important')
      root.style.setProperty('overflow', 'hidden', 'important')
      root.style.setProperty('border-radius', 'clamp(0px, min(44px, 4vw), 44px)', 'important')
    }
    document.body.style.setProperty('display', 'flex', 'important')
    document.body.style.setProperty('justify-content', 'center', 'important')
    document.body.style.setProperty('align-items', 'center', 'important')
    document.body.style.setProperty('background', '#C9CDD4', 'important')
    document.body.style.setProperty('overflow', 'hidden', 'important')
  }, [])

  // ── Auth state ───────────────────────────────────────────────
  const [authUser, setAuthUser]   = useState(null)
  const [profile, setProfile]     = useState(null)
  const authUserRef               = useRef(null)

  // ── UI state ─────────────────────────────────────────────────
  const [screen, setScreen]       = useState(S.SPLASH)
  const [navStack, setNavStack]   = useState([])
  const [navTab, setNavTab]       = useState('home')
  const [obIdx, setObIdx]         = useState(0)
  // upload
  const [upStep, setUpStep]           = useState(1)
  const [selectedItems, setSelectedItems] = useState([])
  const [canQty, setCanQty]           = useState(1)
  const [bottleQty, setBottleQty]     = useState(1)
  const [weightRange, setWeightRange] = useState('')
  const [itemPhotos, setItemPhotos]   = useState({}) // { itemId: { file, preview } }
  const [disposal, setDisposal]       = useState(null)
  const [uploading, setUploading]     = useState(false)
  // rewards
  const [rwdCat, setRwdCat]       = useState('All')
  const [redeemItem, setRedeemItem] = useState(null)
  // leaderboard
  const [lbTab, setLbTab]         = useState('City')
  // settings
  const [settings, setSettings]   = useState({ uploadNotif:true, rewardNotif:true, weeklyNotif:true, challengeNotif:true, location:true })
  // toast
  const [toast, setToast]         = useState(null)
  // edit profile
  const [editName, setEditName]   = useState('')
  const [editCity, setEditCity]   = useState('Mumbai')
  const [editGender, setEditGender] = useState('')
  // setup profile (first login)
  const [setupName, setSetupName]   = useState('')
  const [setupCity, setSetupCity]   = useState('Mumbai')
  const [setupGender, setSetupGender] = useState('')
  const [setupEmoji, setSetupEmoji]   = useState('🦊')
  // drop step sub-state
  const [dropSubStep, setDropSubStep]   = useState('choose') // 'choose' | 'dropoff' | 'pickup'
  const [pickupType, setPickupType]     = useState(null)     // 'dropoff' | 'pickup'
  const [pickupAddress, setPickupAddress] = useState({ flat:'', street:'', landmark:'' })
  const [gpsFetching, setGpsFetching]   = useState(false)
  const [gpsCoords, setGpsCoords]       = useState(null)
  // help FAQ
  const [openFaq, setOpenFaq]     = useState(null)
  // real user uploads
  const [userUploads, setUserUploads] = useState([])
  // notifications from DB
  const [userNotifs, setUserNotifs] = useState([])
  // drop points from DB
  const [dbDropPoints, setDbDropPoints] = useState([])
  const [dpLoading, setDpLoading]       = useState(false)

  // ── Derived display values ────────────────────────────────────
  const firstName      = profile?.name?.split(' ')[0] || authUser?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const displayCoins   = profile?.greencoins_balance ?? 0
  const displayCans    = profile?.total_approved_cans ?? 0
  const displayUploads = profile?.total_approved_uploads ?? 0
  const displayStreak  = profile?.current_streak ?? 0
  const displayCO2     = calculateCO2Saved(displayCans)
  const displayRefCode = profile?.referral_code ?? '------'
  const nextRewardGap  = Math.max(0, NEXT_REWARD_STATIC.coins - displayCoins)

  // ── Sync edit fields when profile loads ──────────────────────
  useEffect(() => {
    if (profile) {
      setEditName(profile.name || '')
      setEditCity(profile.city || 'Mumbai')
      setEditGender(profile.gender || '')
    }
  }, [profile])

  // ── Auth helpers ─────────────────────────────────────────────
  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase.from('users').select('*').eq('id', uid).single()
    if (data) setProfile(data)
  }, [])

  const loadUserUploads = useCallback(async (uid) => {
    const { data } = await supabase
      .from('uploads')
      .select('*, drop_points(name)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)
    setUserUploads(data || [])
  }, [])

  const loadNotifs = useCallback(async (uid) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30)
    setUserNotifs(data || [])
  }, [])

  const loadDropPoints = useCallback(async (city) => {
    setDpLoading(true)
    const { data } = await supabase
      .from('drop_points')
      .select('*')
      .eq('status', 'active')
      .eq('city', city)
      .order('name')
    setDpLoading(false)
    setDbDropPoints(data || [])
  }, [])

  // ── Auth setup (runs once) ────────────────────────────────────
  useEffect(() => {
    const ensureProfile = async (u) => {
      const { data } = await supabase.from('users').select('id').eq('id', u.id).maybeSingle()
      if (!data) {
        await supabase.from('users').insert({
          id: u.id,
          name: u.user_metadata?.full_name || '',
          city: 'Mumbai',
        })
        return true  // new user
      }
      return false   // existing user
    }

    // Check existing session (page reload / returning user)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setAuthUser(u)
      authUserRef.current = u
      if (u) {
        await loadProfile(u.id)
        loadUserUploads(u.id)
        loadNotifs(u.id)
      }
    })

    // Handle OAuth redirect & sign out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user ?? null
      setAuthUser(u)
      authUserRef.current = u

      if (event === 'SIGNED_IN' && u) {
        const isNew = await ensureProfile(u)
        await loadProfile(u.id)
        loadUserUploads(u.id)
        loadNotifs(u.id)
        setNavStack([])
        setNavTab('home')
        setScreen(isNew ? S.USER_TYPE : S.HOME)
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setUserUploads([])
        setUserNotifs([])
        setNavStack([])
        setNavTab('home')
        setScreen(S.LOGIN)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProfile, loadUserUploads, loadNotifs])

  // ── Splash → transition ───────────────────────────────────────
  useEffect(() => {
    if (screen === S.SPLASH) {
      const t = setTimeout(() => {
        setScreen(authUserRef.current ? S.HOME : S.ONBOARD)
      }, 2200)
      return () => clearTimeout(t)
    }
  }, [screen])

  // ── Toast auto-dismiss ────────────────────────────────────────
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 2500)
      return () => clearTimeout(t)
    }
  }, [toast])

  const showToast = (msg) => setToast(msg)

  // ── Navigation helpers ────────────────────────────────────────
  const go = useCallback((s) => {
    setNavStack(prev => [...prev, screen])
    setScreen(s)
  }, [screen])

  const goBack = useCallback(() => {
    if (navStack.length > 0) {
      const prev = navStack[navStack.length - 1]
      setNavStack(p => p.slice(0, -1))
      setScreen(prev)
    } else navTo('home')
  }, [navStack])

  const navTo = (tab) => {
    setNavTab(tab)
    setNavStack([])
    const map = { home:S.HOME, upload:S.UPLOAD, rewards:S.REWARDS, leaderboard:S.LEADERBOARD, profile:S.PROFILE }
    setScreen(map[tab])
    if (tab === 'upload') { setUpStep(1); setSelectedItems([]); setCanQty(1); setBottleQty(1); setWeightRange(''); setItemPhotos({}); setDisposal(null); setUploading(false); setDropSubStep('choose'); setPickupType(null); setPickupAddress({flat:'',street:'',landmark:''}); setGpsCoords(null); setGpsFetching(false) }
  }

  // ── Auth actions ──────────────────────────────────────────────
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const saveProfile = async () => {
    if (authUser) {
      await supabase.from('users').update({ name: editName, city: editCity, gender: editGender || null }).eq('id', authUser.id)
      setProfile(p => ({ ...p, name: editName, city: editCity, gender: editGender }))
    }
    showToast('Profile updated! ✓')
    goBack()
  }

  const completeSetup = async () => {
    if (!setupName.trim()) return
    if (authUser) {
      await supabase.from('users').update({
        name: setupName.trim(),
        city: setupCity,
        gender: setupGender || null,
        avatar_url: setupEmoji,
      }).eq('id', authUser.id)
      await loadProfile(authUser.id)
    }
    setScreen(S.HOME)
  }

  // ── Upload submit ─────────────────────────────────────────────
  const submitUpload = async () => {
    if (!authUser) { setUpStep(4); return }
    setUploading(true)

    const uploadedUrls = []
    for (const [itemId, { file }] of Object.entries(itemPhotos)) {
      if (!file) continue
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${authUser.id}/${Date.now()}-${itemId}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('uploads')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (!storageErr) {
        const { data } = supabase.storage.from('uploads').getPublicUrl(path)
        uploadedUrls.push(data.publicUrl)
      }
    }
    const photoUrl = uploadedUrls[0] || null

    const totalCans = (selectedItems.includes('cans') ? canQty : 0) + (selectedItems.includes('bottles') ? bottleQty : 0)
    const fullPickupAddress = pickupType === 'pickup'
      ? [pickupAddress.flat, pickupAddress.street, pickupAddress.landmark].filter(Boolean).join(', ')
      : disposal
    const { error } = await supabase.from('uploads').insert({
      user_id: authUser.id,
      can_count: totalCans,
      status: 'pending',
      photo_url: photoUrl,
      photo_urls: uploadedUrls,
      item_types: selectedItems,
      estimated_weight_range: weightRange || null,
      pickup_type: pickupType || 'dropoff',
      pickup_address: fullPickupAddress || null,
    })
    setUploading(false)
    if (error) { showToast('Submit failed — try again'); return }
    await loadUserUploads(authUser.id)
    const hasCountable = selectedItems.includes('cans') || selectedItems.includes('bottles')
    setUpStep(hasCountable ? 6 : 5) // success step
  }

  // ── Format DB upload for activity screen ─────────────────────
  const fmtUpload = (u) => ({
    ico: '🥫',
    title: `${u.can_count} Aluminium Can${u.can_count !== 1 ? 's' : ''}`,
    date: new Date(u.created_at).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }),
    status: u.status,
    coins: u.coins_awarded,
    drop: u.drop_points?.name,
  })
  const activityRows = userUploads.length > 0 ? userUploads.map(fmtUpload) : []
  const unreadNotifCount = userNotifs.filter(n => !n.is_read).length

  // ── BOTTOM NAV ────────────────────────────────────────────────
  const BottomNav = () => (
    <nav className="bottom-nav">
      {[{id:'home',label:'Home',I:Home},{id:'leaderboard',label:'Rank',I:Trophy}].map(({id,label,I})=>(
        <button key={id} className={`nav-item ${navTab===id?'on':''}`} onClick={()=>navTo(id)}>
          <span className="nav-ico"><I size={21}/></span>
          <span className="nav-lbl">{label}</span>
        </button>
      ))}
      <button className="nav-fab" onClick={()=>navTo('upload')}><Upload size={20}/></button>
      {[{id:'rewards',label:'Rewards',I:Gift},{id:'profile',label:'Profile',I:User}].map(({id,label,I})=>(
        <button key={id} className={`nav-item ${navTab===id?'on':''}`} onClick={()=>navTo(id)}>
          <span className="nav-ico"><I size={21}/></span>
          <span className="nav-lbl">{label}</span>
        </button>
      ))}
    </nav>
  )

  const SubShell = ({ title, sub, children }) => (
    <div className="screen">
      <div className="scroll">
        <div className="up-header">
          <button className="back-btn" onClick={goBack}><ArrowLeft size={17}/></button>
          <div><div className="up-title">{title}</div>{sub&&<div className="up-sub">{sub}</div>}</div>
        </div>
        {children}
      </div>
      <BottomNav/>
    </div>
  )

  const RedeemModal = () => (
    <div className="overlay" onClick={()=>setRedeemItem(null)}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sheet-handle"/>
        <button className="sheet-close" onClick={()=>setRedeemItem(null)}><X size={18}/></button>
        <div style={{textAlign:'center',padding:'8px 0 20px'}}>
          <div className="sheet-emoji">{redeemItem.em}</div>
          <div className="sheet-title">Voucher Redeemed!</div>
          <div className="sheet-name">{redeemItem.name}</div>
          <div className="code-box">
            <span className="code-txt">{redeemItem.code}</span>
            <button className="code-copy" onClick={()=>{
              navigator.clipboard?.writeText(redeemItem.code).catch(()=>{})
              showToast('Code copied!')
              setRedeemItem(null)
            }}><Copy size={15}/> Copy</button>
          </div>
          <p className="sheet-note">Valid for 30 days · Show at partner store</p>
          <button className="btn btn-g btn-full" style={{marginTop:16}} onClick={()=>setRedeemItem(null)}>Done</button>
        </div>
      </div>
    </div>
  )

  const Toast = () => <div className="toast">{toast}</div>

  // ─────────────────────────────────────────────────────────────
  //  SCREENS
  // ─────────────────────────────────────────────────────────────

  // SPLASH
  if (screen === S.SPLASH) {
    const pts = Array.from({length:14},(_,i)=>({
      w:18+(i*19)%55, l:(i*17+5)%88, top:(i*23+8)%85,
      delay:(i*.38)%3.5, dur:3+(i*.6)%4,
    }))
    return (
      <div className="splash">
        {pts.map((p,i)=>(
          <div key={i} className="particle" style={{width:p.w,height:p.w,left:`${p.l}%`,top:`${p.top}%`,animationDelay:`${p.delay}s`,animationDuration:`${p.dur}s`}}/>
        ))}
        <div className="splash-mark"><span className="g">re</span><span>loop</span></div>
        <div className="splash-tag">Waste. Rewarded.</div>
      </div>
    )
  }

  // ONBOARDING
  if (screen === S.ONBOARD) {
    const d = ONBOARDS[obIdx], last = obIdx===ONBOARDS.length-1
    return (
      <div className="onboard">
        <button className="skip-btn" onClick={()=>setScreen(S.LOGIN)}>Skip</button>
        <div className="ob-art">
          <div className="ob-circle" style={{background:d.bg,color:d.color}}>
            {d.em}<div className="ob-ring" style={{color:d.color}}/>
          </div>
        </div>
        <div>
          <div className="ob-copy"><h2>{d.title}</h2><p>{d.desc}</p></div>
          <div className="dots">{ONBOARDS.map((_,i)=><div key={i} className={`dot ${i===obIdx?'on':''}`}/>)}</div>
          <div className="btn-row">
            {obIdx>0&&<button className="btn btn-o" onClick={()=>setObIdx(i=>i-1)}>Back</button>}
            <button className="btn btn-g" onClick={()=>last?setScreen(S.LOGIN):setObIdx(i=>i+1)}>
              {last?'Get Started':'Next'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // LOGIN
  if (screen === S.LOGIN) return (
    <div className="login-wrap login-screen">
      <div className="login-orb-1"/>
      <div className="login-orb-2"/>
      <div className="login-top login-a1">
        <div className="login-logo"><span className="g">re</span>loop</div>
      </div>
      <div className="login-mid login-a2">
        <h1 className="login-headline">Turn cans into<br/>rewards</h1>
        <p className="login-tagline">Drop cans. Earn GreenCoins. Unlock rewards.</p>
        <div className="login-a3" style={{marginTop:36}}>
          <button className="btn-google" onClick={signInWithGoogle}>
            <span className="google-g">G</span>
            Continue with Google
          </button>
        </div>
      </div>
      <p className="tos login-a4">By continuing you agree to our Terms of Service &amp; Privacy Policy</p>
    </div>
  )

  // USER TYPE SELECTION
  if (screen === S.USER_TYPE) return (
    <div className="login-wrap login-screen">
      <div className="login-orb-1"/>
      <div className="login-orb-2"/>
      <div className="login-top login-a1">
        <div className="login-logo"><span className="g">re</span>loop</div>
      </div>
      <div className="login-mid login-a2">
        <h1 className="login-headline" style={{fontSize:32,marginBottom:6}}>How will you use ReLoop?</h1>
        <p className="login-tagline" style={{marginBottom:28}}>Pick your account type to get started</p>
        <div className="login-a3" style={{display:'flex',flexDirection:'column',gap:12}}>
          <button className="utype-card" onClick={()=>{
            setSetupName(authUser?.user_metadata?.full_name || '')
            setSetupCity('Mumbai')
            setSetupGender('')
            setSetupEmoji(EMOJI_POOL[Math.floor(Math.random()*EMOJI_POOL.length)])
            go(S.SETUP_PROFILE)
          }}>
            <div className="utype-ico" style={{background:'#D1FAE5'}}>🧑</div>
            <div className="utype-info">
              <div className="utype-title">Personal Recycling</div>
              <div className="utype-sub">Earn rewards by dropping cans · For students &amp; households</div>
            </div>
            <ChevronRight size={18} color="var(--green)"/>
          </button>
          <button className="utype-card" onClick={()=>go(S.BUSINESS_SOON)}>
            <div className="utype-ico" style={{background:'#DBEAFE'}}>🏢</div>
            <div className="utype-info">
              <div className="utype-title">Business Recycling</div>
              <div className="utype-sub">Bulk recycling &amp; settlements · For cafes, gyms, offices</div>
            </div>
            <div className="coming-chip" style={{flexShrink:0,fontSize:10}}>Soon</div>
          </button>
        </div>
      </div>
      <p className="tos login-a4">You can switch account types anytime from Settings</p>
    </div>
  )

  // SETUP PROFILE (first login, after choosing Personal)
  if (screen === S.SETUP_PROFILE) return (
    <div className="scroll" style={{background:'var(--bg)',minHeight:'100%',padding:'0 0 40px'}}>
      {/* Header */}
      <div style={{padding:'52px 24px 0',textAlign:'center'}}>
        <div style={{fontSize:13,fontWeight:700,color:'var(--green)',letterSpacing:1,marginBottom:8}}>WELCOME TO RELOOP</div>
        <h1 style={{fontSize:26,fontWeight:900,color:'var(--text)',letterSpacing:'-.5px',marginBottom:6}}>Set up your profile</h1>
        <p style={{fontSize:14,color:'var(--sub)'}}>Takes 30 seconds · Can be changed anytime</p>
      </div>

      {/* Emoji Avatar */}
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginTop:28,marginBottom:8}}>
        <div style={{width:90,height:90,borderRadius:'50%',background:'var(--green-l)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:44,marginBottom:10,boxShadow:'0 4px 16px rgba(21,154,91,.15)'}}>
          {setupEmoji}
        </div>
        <button
          style={{fontSize:12,fontWeight:600,color:'var(--green)',background:'none',border:'1.5px solid var(--green)',borderRadius:20,padding:'5px 14px',cursor:'pointer'}}
          onClick={()=>setSetupEmoji(EMOJI_POOL[Math.floor(Math.random()*EMOJI_POOL.length)])}
        >🔄 Change Avatar</button>
      </div>

      {/* Form */}
      <div style={{padding:'0 20px',display:'flex',flexDirection:'column',gap:18,marginTop:20}}>
        {/* Name */}
        <div>
          <label className="fld-lbl">Full Name</label>
          <input
            className="input"
            placeholder="e.g. Rohit Sharma"
            value={setupName}
            onChange={e=>setSetupName(e.target.value)}
          />
        </div>

        {/* City */}
        <div>
          <label className="fld-lbl">City</label>
          <select
            className="input"
            value={setupCity}
            onChange={e=>setSetupCity(e.target.value)}
            style={{appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',paddingRight:36}}
          >
            {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Gender */}
        <div>
          <label className="fld-lbl">I am</label>
          <div style={{display:'flex',gap:10,marginTop:6}}>
            {[['male','👨 Male'],['female','👩 Female'],['other','🧑 Other']].map(([val,label])=>(
              <button
                key={val}
                onClick={()=>setSetupGender(val)}
                style={{
                  flex:1, padding:'10px 0', borderRadius:12, fontSize:13, fontWeight:600,
                  border: setupGender===val ? '2px solid var(--green)' : '1.5px solid var(--border)',
                  background: setupGender===val ? 'var(--green-l)' : 'var(--card)',
                  color: setupGender===val ? 'var(--green)' : 'var(--sub)',
                  cursor:'pointer', transition:'all .15s'
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          className="btn btn-g btn-full"
          style={{marginTop:8,fontSize:16,padding:'16px',borderRadius:16}}
          onClick={completeSetup}
          disabled={!setupName.trim()}
        >
          Let's Go! 🚀
        </button>
        <p style={{textAlign:'center',fontSize:12,color:'var(--sub)',marginTop:-8}}>You can edit this anytime from Profile</p>
      </div>
    </div>
  )

  // BUSINESS COMING SOON
  if (screen === S.BUSINESS_SOON) return (
    <div className="login-wrap">
      <div style={{textAlign:'center'}}>
        <button className="back-btn" style={{marginBottom:24,alignSelf:'flex-start'}} onClick={goBack}><ArrowLeft size={17}/></button>
        <div style={{fontSize:64,marginBottom:16}}>🏢</div>
        <div className="login-h1" style={{fontSize:22}}>Business Dashboard</div>
        <div className="login-sub" style={{marginBottom:24}}>Coming very soon</div>
        <div style={{background:'var(--card)',borderRadius:18,padding:'20px 16px',textAlign:'left',boxShadow:'var(--shadow)'}}>
          {[
            {ico:'📦',t:'Bulk recycling management',s:'Track kg recycled across all your locations'},
            {ico:'💰',t:'Earnings & settlements',s:'Monthly payouts direct to your bank'},
            {ico:'📊',t:'Recycling analytics',s:'Impact reports, graphs, ESG data for your brand'},
            {ico:'🚚',t:'Pickup scheduling',s:'Request pickups — we come to you'},
          ].map((f,i)=>(
            <div key={i} style={{display:'flex',gap:12,padding:'12px 0',borderBottom:i<3?'1px solid var(--border)':'none'}}>
              <div style={{fontSize:22,width:32,flexShrink:0}}>{f.ico}</div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{f.t}</div>
                <div style={{fontSize:12,color:'var(--sub)',marginTop:2}}>{f.s}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-g btn-full" style={{marginTop:24}} onClick={()=>showToast('We\'ll notify you when it\'s live! 🚀')}>
          Notify Me When Ready
        </button>
        {toast&&<Toast/>}
      </div>
    </div>
  )

  // HOME
  if (screen === S.HOME) return (
    <div className="screen">
      <div className="scroll">
        <div className="home-pad">
          <div className="pg-hd">
            <div className="pg-hd-left">
              <h1>Hey {firstName} 👋</h1>
              <p>Good {new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'} · {profile?.city||'Mumbai'}</p>
            </div>
            <button className="icon-btn" onClick={()=>go(S.NOTIFICATIONS)}>
              <Bell size={19}/>
              {unreadNotifCount > 0 && <div className="red-dot"/>}
            </button>
          </div>

          <div className="hero-card">
            <div className="hero-shine"/>
            <div className="hero-lbl">GreenCoins Balance</div>
            <div className="hero-val">{displayCoins.toLocaleString()}</div>
            <div className="hero-hint">Redeem GreenCoins for exciting rewards ✨</div>
            <div className="hero-pills">
              {displayStreak > 0 && <div className="hero-pill pill-streak">🔥 {displayStreak}-Day Streak</div>}
              <div className="hero-pill pill-rank">🏆 Mumbai</div>
            </div>
            <div className="hero-stats">
              <div className="hs"><div className="hs-v">{displayCans}</div><div className="hs-l">Cans Recycled</div></div>
              <div className="hs"><div className="hs-v">{displayUploads}</div><div className="hs-l">Approved Uploads</div></div>
              <div className="hs"><div className="hs-v">{displayCO2}</div><div className="hs-l">CO₂ Saved</div></div>
            </div>
          </div>

          <button className="cta-btn" onClick={()=>navTo('upload')}>
            <Upload size={18}/> UPLOAD ITEMS
          </button>

          {/* Next Reward Progress */}
          <div className="next-reward-bar" onClick={()=>navTo('rewards')}>
            <div className="nrb-left">
              <span className="nrb-em">{NEXT_REWARD_STATIC.em}</span>
              <div>
                <div className="nrb-title">
                  {nextRewardGap > 0
                    ? `${nextRewardGap} more coins → ${NEXT_REWARD_STATIC.name}`
                    : `You can redeem ${NEXT_REWARD_STATIC.name}!`}
                </div>
                <div className="nrb-prog-wrap">
                  <div className="nrb-prog-track">
                    <div className="nrb-prog-fill" style={{width:`${Math.min(100,Math.round((displayCoins/NEXT_REWARD_STATIC.coins)*100))}%`}}/>
                  </div>
                  <span className="nrb-pct">{Math.min(100,Math.round((displayCoins/NEXT_REWARD_STATIC.coins)*100))}%</span>
                </div>
              </div>
            </div>
            <ChevronRight size={15} color="var(--green)"/>
          </div>

          <div className="impact-strip">
            <div className="imp"><div className="imp-v">{displayCO2}</div><div className="imp-l">CO₂ Saved</div></div>
            <div className="imp"><div className="imp-v">{displayCans}</div><div className="imp-l">Cans Recycled</div></div>
            <div className="imp"><div className="imp-v">{displayStreak}🔥</div><div className="imp-l">Day Streak</div></div>
          </div>

          <div className="sec">
            <div className="sec-hd">
              <h3>Recent Upload</h3>
              <button className="sec-link" onClick={()=>go(S.ACTIVITY)}>See all</button>
            </div>
            {activityRows.length > 0 ? (
              <div className="recent-card" onClick={()=>go(S.ACTIVITY)}>
                <div className="recent-ico" style={{background: activityRows[0].status==='approved'?'#D1FAE5':activityRows[0].status==='rejected'?'#FEE2E2':'#FEF3C7'}}>🥫</div>
                <div className="recent-info">
                  <div className="recent-title">{activityRows[0].title}</div>
                  <div className="recent-sub">{activityRows[0].date}{activityRows[0].drop ? ` · ${activityRows[0].drop}` : ''}</div>
                </div>
                <div className={`status-chip ${activityRows[0].status==='approved'?'chip-approved':activityRows[0].status==='rejected'?'chip-rejected':'chip-pending'}`}>
                  {activityRows[0].status==='approved'?'Approved ✓':activityRows[0].status==='rejected'?'Rejected':'Pending'}
                </div>
              </div>
            ) : (
              <div className="recent-card" style={{opacity:.6}}>
                <div className="recent-ico" style={{background:'#F3F4F6'}}>📭</div>
                <div className="recent-info">
                  <div className="recent-title">No uploads yet</div>
                  <div className="recent-sub">Tap Upload Items to get started</div>
                </div>
              </div>
            )}
          </div>

          <div className="sec">
            <div className="sec-hd"><h3>Quick Actions</h3></div>
            <div className="qa-grid">
              {[
                {ico:'📍',bg:'#D1FAE5',title:'Drop Points', sub:'5 near you',    fn:()=>go(S.DROP_POINTS)},
                {ico:'🎁',bg:'#FEF3C7',title:'Rewards',     sub:'7 available',   fn:()=>navTo('rewards')},
                {ico:'🏅',bg:'#DBEAFE',title:'Challenges',  sub:'4 active',      fn:()=>go(S.CHALLENGES)},
                {ico:'👥',bg:'#F3E8FF',title:'Refer Friends',sub:'+250 coins each',fn:()=>go(S.REFERRAL)},
              ].map((c,i)=>(
                <button key={i} className="qa-card" onClick={c.fn}>
                  <div className="qa-ico" style={{background:c.bg}}>{c.ico}</div>
                  <div className="qa-title">{c.title}</div>
                  <div className="qa-sub">{c.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <BottomNav/>
      {toast&&<Toast/>}
    </div>
  )

  // UPLOAD
  if (screen === S.UPLOAD) {
    const hasCountable = selectedItems.includes('cans') || selectedItems.includes('bottles')
    const steps = hasCountable
      ? ['Select Items','Quantities','Est. Weight','Photo','Drop Point']
      : ['Select Items','Est. Weight','Photo','Drop Point']

    // step numbers shift when countable items are selected
    const STEP = hasCountable
      ? { items:1, qty:2, weight:3, photo:4, drop:5, success:6 }
      : { items:1, qty:null, weight:2, photo:3, drop:4, success:5 }

    const totalSteps = hasCountable ? 5 : 4

    const toggleItem = (id) => setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

    const QtyCounter = ({ label, emoji, value, onChange }) => (
      <div style={{background:'var(--card)',borderRadius:16,padding:'16px',display:'flex',alignItems:'center',justifyContent:'space-between',boxShadow:'var(--shadow)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:28}}>{emoji}</span>
          <span style={{fontSize:15,fontWeight:700,color:'var(--text)'}}>{label}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <button className="qty-btn" onClick={()=>onChange(Math.max(1,value-1))}><Minus size={18}/></button>
          <span style={{fontSize:22,fontWeight:800,minWidth:32,textAlign:'center'}}>{value}</span>
          <button className="qty-btn" onClick={()=>onChange(value+1)}><Plus size={18}/></button>
        </div>
      </div>
    )

    const step1 = (
      <div>
        <p className="up-hint">What are you recycling today? Select all that apply.</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
          {ITEMS_CATALOG.map(item => {
            const on = selectedItems.includes(item.id)
            return (
              <button key={item.id} onClick={()=>toggleItem(item.id)} style={{
                background: on ? item.color : 'var(--card)',
                border: on ? '2px solid var(--green)' : '1.5px solid var(--border)',
                borderRadius:16, padding:'16px 12px',
                display:'flex', flexDirection:'column', alignItems:'center', gap:8,
                cursor:'pointer', transition:'all .15s', position:'relative'
              }}>
                {on && <div style={{position:'absolute',top:8,right:8,background:'var(--green)',borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Check size={10} color="#fff"/>
                </div>}
                <span style={{fontSize:32}}>{item.emoji}</span>
                <span style={{fontSize:13,fontWeight:700,color:'var(--text)',textAlign:'center'}}>{item.name}</span>
              </button>
            )
          })}
        </div>
        <button
          className={`btn btn-g btn-full${selectedItems.length===0?' btn-dim':''}`}
          disabled={selectedItems.length===0}
          onClick={()=>setUpStep(hasCountable ? STEP.qty : STEP.weight)}>
          Continue ({selectedItems.length} selected)
        </button>
      </div>
    )

    const stepQty = (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        <p className="up-hint">How many of each are you bringing?</p>
        {selectedItems.includes('cans') && (
          <QtyCounter label="Aluminium Cans" emoji="🥫" value={canQty} onChange={setCanQty}/>
        )}
        {selectedItems.includes('bottles') && (
          <QtyCounter label="Beer Bottles" emoji="🍺" value={bottleQty} onChange={setBottleQty}/>
        )}
        <button className="btn btn-g btn-full" style={{marginTop:8}} onClick={()=>setUpStep(STEP.weight)}>
          Continue
        </button>
      </div>
    )

    const step2 = (
      <div>
        <p className="up-hint">Roughly how much are you bringing? Collector will verify the exact weight.</p>
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20}}>
          {WEIGHT_RANGES.map(w => (
            <button key={w.value} onClick={()=>setWeightRange(w.value)} style={{
              background: weightRange===w.value ? '#D1FAE5' : 'var(--card)',
              border: weightRange===w.value ? '2px solid var(--green)' : '1.5px solid var(--border)',
              borderRadius:14, padding:'16px 18px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              cursor:'pointer', transition:'all .15s'
            }}>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>{w.label}</div>
                <div style={{fontSize:13,color:'var(--sub)',marginTop:2}}>{w.sub}</div>
              </div>
              <div style={{
                width:22,height:22,borderRadius:'50%',flexShrink:0,
                border: weightRange===w.value ? 'none' : '2px solid var(--border)',
                background: weightRange===w.value ? 'var(--green)' : 'transparent',
                display:'flex',alignItems:'center',justifyContent:'center'
              }}>
                {weightRange===w.value && <Check size={12} color="#fff"/>}
              </div>
            </button>
          ))}
        </div>
        <button
          className={`btn btn-g btn-full${!weightRange?' btn-dim':''}`}
          disabled={!weightRange}
          onClick={()=>setUpStep(STEP.photo)}>
          Continue
        </button>
      </div>
    )

    const allItemsHavePhotos = selectedItems.length > 0 && selectedItems.every(id => itemPhotos[id]?.preview)

    const step3 = (
      <div>
        <p className="up-hint">Add one photo per item for faster verification.</p>
        <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:20}}>
          {selectedItems.map(itemId => {
            const item = ITEMS_CATALOG.find(x => x.id === itemId)
            const photo = itemPhotos[itemId]
            return (
              <div key={itemId}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
                  <span>{item.emoji}</span> {item.name}
                  {photo?.preview && <span style={{marginLeft:'auto',fontSize:11,color:'var(--green)',fontWeight:600}}>✓ Added</span>}
                </div>
                <label style={{display:'block',cursor:'pointer'}}>
                  <input
                    type="file" accept="image/*" capture="environment"
                    style={{display:'none'}}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      const reader = new FileReader()
                      reader.onload = ev => setItemPhotos(prev => ({
                        ...prev,
                        [itemId]: { file: f, preview: ev.target.result }
                      }))
                      reader.readAsDataURL(f)
                    }}
                  />
                  {photo?.preview
                    ? <div style={{height:110,borderRadius:14,overflow:'hidden',position:'relative',background:item.color}}>
                        <img src={photo.preview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        <div style={{position:'absolute',bottom:8,right:8,background:'rgba(0,0,0,.5)',borderRadius:8,padding:'3px 8px',fontSize:11,color:'#fff',fontWeight:600}}>Tap to retake</div>
                      </div>
                    : <div style={{height:110,borderRadius:14,border:'2px dashed var(--border)',background:'var(--card)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
                        <span style={{fontSize:28}}>📷</span>
                        <span style={{fontSize:12,color:'var(--sub)',fontWeight:600}}>Tap to add photo</span>
                      </div>
                  }
                </label>
              </div>
            )
          })}
        </div>
        <div style={{fontSize:12,color:'var(--sub)',textAlign:'center',marginBottom:8}}>
          {selectedItems.filter(id=>!itemPhotos[id]?.preview).length > 0
            ? `${selectedItems.filter(id=>!itemPhotos[id]?.preview).length} photo(s) still needed`
            : '✓ All photos added'}
        </div>
        <button className={`btn btn-g btn-full${!allItemsHavePhotos?' btn-dim':''}`} disabled={!allItemsHavePhotos} onClick={()=>setUpStep(STEP.drop)}>Continue</button>
      </div>
    )

    const pickupAddressValid = pickupAddress.flat.trim() && pickupAddress.street.trim()

    const step4 = dropSubStep === 'choose' ? (
      <div>
        <p className="up-hint">How do you want to recycle?</p>
        <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:20}}>
          <button onClick={()=>{ setPickupType('dropoff'); setDropSubStep('dropoff') }} style={{
            background:'var(--card)',border:'1.5px solid var(--border)',borderRadius:18,
            padding:'20px 18px',display:'flex',alignItems:'center',gap:16,cursor:'pointer',
            textAlign:'left',transition:'all .15s'
          }}>
            <div style={{width:52,height:52,borderRadius:14,background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:26}}>
              📍
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:800,color:'var(--text)',marginBottom:3}}>Drop Off</div>
              <div style={{fontSize:13,color:'var(--sub)',lineHeight:1.4}}>Find a nearby ReLoop partner and drop off your items yourself</div>
            </div>
            <ChevronRight size={18} color="var(--green)"/>
          </button>
          <button onClick={()=>{ setPickupType('pickup'); setDropSubStep('pickup') }} style={{
            background:'var(--card)',border:'1.5px solid var(--border)',borderRadius:18,
            padding:'20px 18px',display:'flex',alignItems:'center',gap:16,cursor:'pointer',
            textAlign:'left',transition:'all .15s'
          }}>
            <div style={{width:52,height:52,borderRadius:14,background:'#DBEAFE',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:26}}>
              🚗
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:16,fontWeight:800,color:'var(--text)',marginBottom:3}}>Request Pickup</div>
              <div style={{fontSize:13,color:'var(--sub)',lineHeight:1.4}}>A collector comes to your address · Share your location</div>
            </div>
            <ChevronRight size={18} color="var(--green)"/>
          </button>
        </div>
      </div>
    ) : dropSubStep === 'dropoff' ? (() => {
      const city = profile?.city || 'Mumbai'
      if (dbDropPoints.length === 0 && !dpLoading) loadDropPoints(city)
      const pts = dbDropPoints.length > 0 ? dbDropPoints : DROP_POINTS_MOCK.map(d=>({
        id:d.name, name:d.name, address:d.addr, icon:d.ico, bg_color:d.bg, tags:d.tags
      }))
      return (
        <div>
          <p className="up-hint">Select a drop point in {city}.</p>
          {dpLoading && <div style={{textAlign:'center',padding:'20px 0',color:'var(--sub)',fontSize:14}}>Loading drop points…</div>}
          {!dpLoading && pts.length === 0 && (
            <div style={{textAlign:'center',padding:'24px 0',color:'var(--sub)'}}>
              <div style={{fontSize:36,marginBottom:8}}>📍</div>
              <div style={{fontSize:14,fontWeight:600}}>No drop points in {city} yet</div>
            </div>
          )}
          <div className="disp-list">
            {pts.map((dp,i)=>(
              <div key={dp.id||i} className={`disp-opt ${disposal===dp.name?'on':''}`} onClick={()=>setDisposal(dp.name)}>
                <span className="d-ico" style={{fontSize:22}}>{dp.icon||'📍'}</span>
                <div className="d-txt">
                  <h4>{dp.name}</h4>
                  <p>{dp.address}</p>
                </div>
                <div className="radio">{disposal===dp.name&&<div className="radio-dot"/>}</div>
              </div>
            ))}
          </div>
          <button
            className={`btn btn-g btn-full${(!disposal||uploading)?' btn-dim':''}`}
            style={{marginTop:20}}
            disabled={!disposal || uploading}
            onClick={submitUpload}>
            {uploading ? 'Submitting…' : 'Submit Upload'}
          </button>
        </div>
      )
    })() : (
      <div>
        <p className="up-hint">Share your location so our collector can reach you.</p>
        {/* GPS button */}
        <button
          onClick={()=>{
            if (!navigator.geolocation) { showToast('Location not supported'); return }
            setGpsFetching(true)
            navigator.geolocation.getCurrentPosition(
              pos => { setGpsCoords({ lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }); setGpsFetching(false) },
              ()  => { showToast('Could not fetch location'); setGpsFetching(false) },
              { timeout: 10000 }
            )
          }}
          style={{
            width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            padding:'14px',borderRadius:14,marginBottom:18,cursor:'pointer',
            background: gpsCoords ? '#D1FAE5' : 'var(--card)',
            border: gpsCoords ? '1.5px solid var(--green)' : '1.5px dashed var(--border)',
            fontSize:14,fontWeight:700,
            color: gpsCoords ? 'var(--green)' : 'var(--sub)',
          }}>
          {gpsFetching
            ? <><span style={{fontSize:18}}>⏳</span> Fetching GPS…</>
            : gpsCoords
              ? <><Navigation size={16}/> GPS Captured · {gpsCoords.lat}, {gpsCoords.lng}</>
              : <><MapPin size={16}/> Use My Current Location (GPS)</>
          }
        </button>
        {/* Address form */}
        <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:20}}>
          <div>
            <label className="fld-lbl">Flat / House Number *</label>
            <input className="input" placeholder="e.g. B-204, Sunrise Apartments"
              value={pickupAddress.flat}
              onChange={e=>setPickupAddress(p=>({...p,flat:e.target.value}))}/>
          </div>
          <div>
            <label className="fld-lbl">Street / Area *</label>
            <input className="input" placeholder="e.g. Link Road, Andheri West"
              value={pickupAddress.street}
              onChange={e=>setPickupAddress(p=>({...p,street:e.target.value}))}/>
          </div>
          <div>
            <label className="fld-lbl">Landmark (optional)</label>
            <input className="input" placeholder="e.g. Near Café Coffee Day"
              value={pickupAddress.landmark}
              onChange={e=>setPickupAddress(p=>({...p,landmark:e.target.value}))}/>
          </div>
        </div>
        <button
          className={`btn btn-g btn-full${(!pickupAddressValid||uploading)?' btn-dim':''}`}
          disabled={!pickupAddressValid || uploading}
          onClick={submitUpload}>
          {uploading ? 'Submitting…' : 'Request Pickup 🚗'}
        </button>
      </div>
    )

    const stepSuccess = (
      <div className="success-wrap">
        <div className="s-anim">🎉</div>
        <div className="s-coins">Submitted!</div>
        <div className="s-lbl">Upload Pending Verification</div>
        <div className="pending-chip"><span>⏳</span>Collector will verify within 24 hours</div>
        <div style={{background:'var(--card)',borderRadius:14,padding:'14px 16px',margin:'16px 0',textAlign:'left'}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--sub)',marginBottom:8}}>YOUR SUBMISSION</div>
          {selectedItems.includes('cans') && <div style={{fontSize:13,color:'var(--text)',marginBottom:4}}>🥫 {canQty} Aluminium Can{canQty!==1?'s':''}</div>}
          {selectedItems.includes('bottles') && <div style={{fontSize:13,color:'var(--text)',marginBottom:4}}>🍺 {bottleQty} Beer Bottle{bottleQty!==1?'s':''}</div>}
          {selectedItems.filter(id=>id!=='cans'&&id!=='bottles').map(id=>(
            <div key={id} style={{fontSize:13,color:'var(--text)',marginBottom:4}}>
              {ITEMS_CATALOG.find(x=>x.id===id)?.emoji} {ITEMS_CATALOG.find(x=>x.id===id)?.name}
            </div>
          ))}
          <div style={{fontSize:13,color:'var(--text)',marginTop:4}}>⚖️ Est. {weightRange} kg</div>
          {pickupType === 'pickup'
            ? <div style={{fontSize:13,color:'var(--text)',marginTop:4}}>🚗 Pickup from: {[pickupAddress.flat,pickupAddress.street,pickupAddress.landmark].filter(Boolean).join(', ')}</div>
            : <div style={{fontSize:13,color:'var(--text)',marginTop:4}}>📍 Drop Off at: {disposal}</div>
          }
        </div>
        <button className="btn btn-g btn-full" onClick={()=>navTo('home')}>Back to Home</button>
        <button className="btn btn-o btn-full" style={{marginTop:10}} onClick={()=>go(S.ACTIVITY)}>View Activity</button>
      </div>
    )

    const contentMap = {
      [STEP.items]:   step1,
      [STEP.weight]:  step2,
      [STEP.photo]:   step3,
      [STEP.drop]:    step4,
      [STEP.success]: stepSuccess,
      ...(hasCountable ? { [STEP.qty]: stepQty } : {}),
    }
    const titleMap = {
      [STEP.items]:   'What are you recycling?',
      [STEP.weight]:  'Estimated Weight',
      [STEP.photo]:   'Add a Photo',
      [STEP.drop]:    'Choose Drop Point',
      ...(hasCountable ? { [STEP.qty]: 'Quantities' } : {}),
    }
    const isSuccess = upStep === STEP.success
    const stepIndex = hasCountable
      ? [STEP.items,STEP.qty,STEP.weight,STEP.photo,STEP.drop].indexOf(upStep)
      : [STEP.items,STEP.weight,STEP.photo,STEP.drop].indexOf(upStep)

    const goBack = () => {
      if (upStep === STEP.items) { navTo('home'); return }
      if (upStep === STEP.drop && dropSubStep !== 'choose') { setDropSubStep('choose'); setDisposal(null); setPickupAddress({flat:'',street:'',landmark:''}); setGpsCoords(null); return }
      if (upStep === STEP.weight) { setUpStep(hasCountable ? STEP.qty : STEP.items); return }
      setUpStep(s => s - 1)
    }

    return (
      <div className="screen">
        <div className="scroll">
          {!isSuccess&&<>
            <div className="up-header">
              <button className="back-btn" onClick={goBack}><ArrowLeft size={17}/></button>
              <div>
                <div className="up-title">{titleMap[upStep]}</div>
                <div className="up-sub">Step {stepIndex+1} of {totalSteps}</div>
              </div>
            </div>
            <div className="step-bar">{steps.map((_,i)=><div key={i} className={`step-seg${i<=stepIndex?' done':''}`}/>)}</div>
          </>}
          <div className="up-body">{contentMap[upStep]}</div>
        </div>
        <BottomNav/>
      </div>
    )
  }

  // REWARDS
  if (screen === S.REWARDS) {
    const cats = ['All','Food','Cafes','Shopping','Fun','Mystery']
    const items = REWARDS_DATA[rwdCat]||[]
    return (
      <div className="screen">
        <div className="scroll">
          <div style={{paddingBottom:16}}>
            <div className="pg-hd">
              <div className="pg-hd-left"><h1>Rewards</h1><p>Redeem your GreenCoins</p></div>
            </div>
            <div className="bal-bar">
              <div>
                <div className="bb-lbl">GreenCoins Balance</div>
                <div className="bb-val">{displayCoins.toLocaleString()}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="bb-lbl">Next Unlock</div>
                <div className="bb-val" style={{fontSize:15}}>
                  {nextRewardGap > 0 ? `☕ ${nextRewardGap} more` : '☕ Ready!'}
                </div>
              </div>
            </div>
            <div className="partner-strip">
              <div>
                <div style={{display:'flex',gap:6,marginBottom:6}}>
                  <div className="p-chip">Blinkit</div>
                  <div className="p-chip">Zepto</div>
                  <div className="p-chip">Instamart</div>
                </div>
                <div><div className="partner-h4">Quick Commerce Coming</div><div className="partner-p">Redeem for grocery coupons soon</div></div>
              </div>
              <div className="coming-chip">Soon</div>
            </div>
            <div className="cats">
              {cats.map(c=><button key={c} className={`cat ${rwdCat===c?'on':''}`} onClick={()=>setRwdCat(c)}>{c}</button>)}
            </div>
            <div className="rwds-grid">
              {items.map((r,i)=>(
                <div key={i} className={`rwd-card ${r.mystery?'mystery-card':''}`}>
                  <div className="rwd-thumb" style={{background:r.bg}}>{r.em}</div>
                  <div className="rwd-body">
                    <div className="rwd-name">{r.name}</div>
                    <div className="rwd-coins">🟢 {r.coins} coins</div>
                    <button
                      className={`rwd-btn ${r.mystery?'mystery-btn':''} ${displayCoins < r.coins ? 'btn-dim' : ''}`}
                      onClick={()=>r.mystery?showToast('🎲 Surprise reward unlocked!'):setRedeemItem(r)}>
                      {r.mystery ? '🎲 Reveal' : displayCoins < r.coins ? `Need ${r.coins - displayCoins} more` : 'Redeem'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <BottomNav/>
        {redeemItem&&<RedeemModal/>}
        {toast&&<Toast/>}
      </div>
    )
  }

  // LEADERBOARD
  if (screen === S.LEADERBOARD) {
    const tabs = ['City','Friends','Weekly','All Time']
    const top3 = [
      {rank:2,name:'Riya P.',  pts:'4.2k',em:'🧑'},
      {rank:1,name:'Amit K.',  pts:'5.1k',em:'👩'},
      {rank:3,name:'Sneha J.', pts:'3.8k',em:'🧑'},
    ]
    return (
      <div className="screen">
        <div className="scroll">
          <div style={{paddingBottom:16}}>
            <div className="pg-hd">
              <div className="pg-hd-left"><h1>Leaderboard</h1><p>Mumbai City Rankings</p></div>
            </div>
            <div className="lb-tabs">
              {tabs.map(t=><button key={t} className={`lb-tab ${lbTab===t?'on':''}`} onClick={()=>setLbTab(t)}>{t}</button>)}
            </div>
            <div className="lb-city-impact">
              <div className="lci-title">🌍 Mumbai's Collective Impact</div>
              <div className="lci-stats">
                <div className="lci-s"><div className="lci-v">24,800</div><div className="lci-l">Cans Recycled</div></div>
                <div className="lci-s"><div className="lci-v">2,100kg</div><div className="lci-l">CO₂ Saved</div></div>
                <div className="lci-s"><div className="lci-v">843</div><div className="lci-l">Active Users</div></div>
              </div>
            </div>
            <div className="podium">
              {top3.map((p,i)=>(
                <div key={i} className={`p-item r${p.rank}`} style={{order:p.rank===1?1:p.rank===2?0:2}}>
                  <div className="p-ava">{p.em}</div>
                  <div className="p-name">{p.name}</div>
                  <div className="p-pts">{p.pts}</div>
                  <div className="p-blk">{p.rank}</div>
                </div>
              ))}
            </div>
            <div className="lb-list">
              {LB_ROWS.map((r,i)=>(
                <div key={i} className={`lb-row ${r.me?'me':''}`}>
                  <div className="lb-rank">{r.rank}</div>
                  <div className="lb-ava">🧑</div>
                  <div className="lb-info">
                    <div className="lb-name">{r.me ? `${firstName} 👈` : r.name}</div>
                    <div className="lb-city">{r.city}</div>
                  </div>
                  <div className="lb-pts">{r.me ? displayCoins.toLocaleString() : r.pts.toLocaleString()}</div>
                  <div className="lb-badge">{r.badge}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <BottomNav/>
      </div>
    )
  }

  // PROFILE
  if (screen === S.PROFILE) {
    const menu = [
      {ico:'✏️', title:'Edit Profile',     sub:'Name, photo, location',                    fn:()=>go(S.EDIT_PROFILE)},
      {ico:'📋', title:'Upload History',   sub:`${displayUploads} uploads · ${displayCoins} coins earned`, fn:()=>go(S.ACTIVITY)},
      {ico:'🏅', title:'My Badges',        sub:'4 earned · 4 locked',                      fn:()=>go(S.BADGES)},
      {ico:'👥', title:'Referral Program', sub:'Earn 250 coins per friend',                fn:()=>go(S.REFERRAL)},
      {ico:'⚙️', title:'Settings',         sub:'Notifications, privacy',                   fn:()=>go(S.SETTINGS)},
      {ico:'❓', title:'Help & Support',   sub:'FAQ, contact us',                          fn:()=>go(S.HELP)},
    ]
    return (
      <div className="screen">
        <div className="scroll">
          <div style={{paddingBottom:16}}>
            <div className="prof-top">
              <div className="pa-lg" style={{fontSize:52,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {profile?.avatar_url || '🦊'}
              </div>
              <div className="prof-name">{profile?.name || firstName}</div>
              <div className="prof-handle">@{firstName.toLowerCase()} · {profile?.city||'Mumbai'}</div>
              <div className="prof-stats">
                <div className="ps"><div className="ps-v">{displayCoins.toLocaleString()}</div><div className="ps-l">Coins</div></div>
                <div className="ps"><div className="ps-v">{displayCans}</div><div className="ps-l">Cans</div></div>
                <div className="ps"><div className="ps-v">{displayStreak}🔥</div><div className="ps-l">Streak</div></div>
                <div className="ps"><div className="ps-v">{displayUploads}</div><div className="ps-l">Uploads</div></div>
              </div>
            </div>
            <div className="menu-list">
              {menu.map((m,i)=>(
                <button key={i} className="menu-row" onClick={m.fn}>
                  <div className="m-ico">{m.ico}</div>
                  <div className="m-info"><div className="m-title">{m.title}</div><div className="m-sub">{m.sub}</div></div>
                  <ChevronRight size={15} color="var(--sub)"/>
                </button>
              ))}
              <button className="menu-row" style={{marginTop:8}} onClick={signOut}>
                <div className="m-ico" style={{background:'#FEE2E2'}}>🚪</div>
                <div className="m-info"><div className="m-title" style={{color:'#DC2626'}}>Log Out</div><div className="m-sub">Sign out of Reloop</div></div>
                <ChevronRight size={15} color="#DC2626"/>
              </button>
            </div>
          </div>
        </div>
        <BottomNav/>
      </div>
    )
  }

  // DROP POINTS
  if (screen === S.DROP_POINTS) {
    const city = profile?.city || 'Mumbai'
    if (dbDropPoints.length === 0 && !dpLoading) loadDropPoints(city)
    const pts = dbDropPoints.length > 0 ? dbDropPoints : DROP_POINTS_MOCK.map(d=>({
      id:d.name, name:d.name, address:d.addr, icon:d.ico, bg_color:d.bg, tags:d.tags, status:'active'
    }))
    return (
      <SubShell title="Drop Points" sub={`${pts.length} partner location${pts.length!==1?'s':''} in ${city}`}>
        <div className="dp-map-ph">
          <div className="dp-pin">📍</div>
          <div className="dp-map-label">{city} · Active Partners</div>
          <div className="dp-coming">Interactive map coming soon</div>
        </div>
        <div className="sec">
          <div className="sec-hd"><h3>Partners in {city}</h3></div>
          {dpLoading ? (
            <div style={{textAlign:'center',padding:'32px 0',color:'var(--sub)',fontSize:14}}>Loading…</div>
          ) : pts.length === 0 ? (
            <div style={{textAlign:'center',padding:'32px 0',color:'var(--sub)'}}>
              <div style={{fontSize:40,marginBottom:8}}>📍</div>
              <div style={{fontSize:15,fontWeight:600}}>No drop points in {city} yet</div>
              <div style={{fontSize:13,marginTop:4}}>Check back soon — we're adding partners!</div>
            </div>
          ) : (
            <div className="card-stack">
              {pts.map((dp,i)=>(
                <div key={dp.id||i} className="dp-card">
                  <div className="dp-ico" style={{background:dp.bg_color||'#D1FAE5'}}>{dp.icon||'📍'}</div>
                  <div className="dp-info">
                    <div className="dp-name">{dp.name}</div>
                    <div className="dp-addr">{dp.address}</div>
                    <div className="dp-tags">{(dp.tags||[]).map((t,j)=><span key={j} className="dp-tag">{t}</span>)}</div>
                  </div>
                  <div className="dp-meta">
                    <div className="dp-status">Open</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SubShell>
    )
  }

  // CHALLENGES
  if (screen === S.CHALLENGES) return (
    <SubShell title="Challenges" sub="4 active · Earn bonus coins">
      <div className="sec">
        <div className="card-stack">
          {CHALLENGES.map((c,i)=>{
            const pct = Math.min(100,Math.round((c.prog/c.total)*100))
            return (
              <div key={i} className="ch-card">
                <div className="ch-top">
                  <div className="ch-ico" style={{background:c.bg}}>{c.ico}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="ch-title">{c.name}</div>
                    <div className="ch-sponsor">{c.sponsor}</div>
                  </div>
                  <div className="ch-reward-chip">+{c.reward}</div>
                </div>
                <div className="ch-prog"><div className="ch-bar" style={{width:`${pct}%`}}/></div>
                <div className="ch-foot">
                  <span className="ch-done">{c.prog.toLocaleString()} / {c.total.toLocaleString()}</span>
                  <span className="ch-pct">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </SubShell>
  )

  // ACTIVITY
  if (screen === S.ACTIVITY) {
    const chipCls = {pending:'ac-pending', approved:'ac-approved', rejected:'ac-rejected'}
    const chipTxt = {pending:'Pending', approved:'Approved ✓', rejected:'Rejected'}
    const icoBg   = {pending:'#FEF3C7', approved:'#D1FAE5', rejected:'#FEE2E2'}
    const totalCoins = userUploads.reduce((s,u) => s + (u.coins_awarded||0), 0)
    return (
      <SubShell title="Upload History" sub={`${activityRows.length} uploads · ${totalCoins} GreenCoins earned`}>
        <div className="sec">
          {activityRows.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--sub)'}}>
              <div style={{fontSize:48,marginBottom:12}}>📭</div>
              <div style={{fontSize:15,fontWeight:600}}>No uploads yet</div>
              <div style={{fontSize:13,marginTop:4}}>Tap the Upload button to get started</div>
            </div>
          ) : (
            <div className="card-stack">
              {activityRows.map((a,i)=>(
                <div key={i} className="act-row">
                  <div className="act-ico" style={{background:icoBg[a.status]||'#F3F4F6'}}>{a.ico}</div>
                  <div className="act-info">
                    <div className="act-title">{a.title}</div>
                    <div className="act-date">{a.date}{a.drop ? ` · ${a.drop}` : ''}</div>
                  </div>
                  {a.coins && <div className="act-coins">+{a.coins} 🟢</div>}
                  <div className={`act-chip ${chipCls[a.status]||''}`}>{chipTxt[a.status]||a.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SubShell>
    )
  }

  // REFERRAL
  if (screen === S.REFERRAL) return (
    <SubShell title="Refer Friends" sub="Earn 250 GreenCoins per referral">
      <div className="sec">
        <div className="ref-hero">
          <div className="ref-emoji">👥</div>
          <div className="ref-code-lbl">Your Referral Code</div>
          <div className="ref-code">{displayRefCode}</div>
          <button className="ref-copy-btn" onClick={()=>{
            navigator.clipboard?.writeText(displayRefCode).catch(()=>{})
            showToast('Code copied! 🎉')
          }}>
            <Copy size={15}/> Copy Code
          </button>
        </div>
        <div className="ref-stats-row">
          <div className="ref-stat"><div className="ref-sv">0</div><div className="ref-sl">Friends Invited</div></div>
          <div className="ref-stat"><div className="ref-sv">0 🟢</div><div className="ref-sl">Coins Earned</div></div>
          <div className="ref-stat"><div className="ref-sv">+250</div><div className="ref-sl">Per Referral</div></div>
        </div>
        <div className="sec-hd" style={{marginTop:8}}><h3>How it works</h3></div>
        {[
          {n:'1',t:'Share your code',d:`Send ${displayRefCode} to friends via WhatsApp or any app`},
          {n:'2',t:'Friend signs up',d:'They download Reloop and enter your referral code'},
          {n:'3',t:'Both earn coins',d:'You get 250 coins · They get 100 coins on first upload'},
        ].map((s,i)=>(
          <div key={i} className="how-row">
            <div className="how-num">{s.n}</div>
            <div className="how-info"><div className="how-t">{s.t}</div><div className="how-d">{s.d}</div></div>
          </div>
        ))}
        <button className="btn btn-g btn-full" style={{marginTop:20}} onClick={()=>showToast('Opening share sheet…')}>
          <Share2 size={16}/> Share via WhatsApp
        </button>
      </div>
      {toast&&<Toast/>}
    </SubShell>
  )

  // BADGES
  if (screen === S.BADGES) return (
    <SubShell title="My Badges" sub="4 earned · 4 locked">
      <div className="sec">
        <div className="sec-hd"><h3>Earned</h3></div>
        <div className="badge-grid">
          {BADGES_DATA.filter(b=>b.earned).map((b,i)=>(
            <div key={i} className="badge-card earned">
              <div className="badge-em">{b.ico}</div>
              <div className="badge-name">{b.name}</div>
              <div className="badge-desc">{b.desc}</div>
            </div>
          ))}
        </div>
        <div className="sec-hd" style={{marginTop:20}}><h3>Locked</h3></div>
        <div className="badge-grid">
          {BADGES_DATA.filter(b=>!b.earned).map((b,i)=>(
            <div key={i} className="badge-card locked">
              <div className="badge-em locked-em">{b.ico}</div>
              <div className="badge-name" style={{color:'var(--sub)'}}>{b.name}</div>
              <div className="badge-desc">{b.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </SubShell>
  )

  // SETTINGS
  if (screen === S.SETTINGS) {
    const tog = (key) => setSettings(s=>({...s,[key]:!s[key]}))
    return (
      <SubShell title="Settings" sub="Manage your preferences">
        <div className="sec">
          <div className="sec-hd"><h3>Notifications</h3></div>
          <div className="settings-card">
            {[
              {key:'uploadNotif',   label:'Upload Verification', sub:'When uploads are approved or rejected'},
              {key:'rewardNotif',   label:'New Rewards',         sub:'New vouchers and offers'},
              {key:'weeklyNotif',   label:'Weekly Summary',      sub:'Your weekly impact report'},
              {key:'challengeNotif',label:'Challenges',          sub:'New and expiring challenges'},
            ].map((item,i,arr)=>(
              <div key={item.key} className={`setting-row ${i<arr.length-1?'border-b':''}`}>
                <div className="setting-info"><div className="setting-lbl">{item.label}</div><div className="setting-sub">{item.sub}</div></div>
                <div className={`toggle ${settings[item.key]?'on':''}`} onClick={()=>tog(item.key)}>
                  <div className="toggle-knob"/>
                </div>
              </div>
            ))}
          </div>
          <div className="sec-hd" style={{marginTop:20}}><h3>Preferences</h3></div>
          <div className="settings-card">
            <div className="setting-row border-b">
              <div className="setting-info"><div className="setting-lbl">Location</div><div className="setting-sub">For nearby drop points</div></div>
              <div className={`toggle ${settings.location?'on':''}`} onClick={()=>tog('location')}><div className="toggle-knob"/></div>
            </div>
            <div className="setting-row">
              <div className="setting-info"><div className="setting-lbl">Language</div><div className="setting-sub">English</div></div>
              <span style={{fontSize:13,color:'var(--sub)',fontWeight:600}}>Change</span>
            </div>
          </div>
          <button className="danger-btn" onClick={()=>showToast('Account deletion request sent')}>Delete Account</button>
        </div>
        {toast&&<Toast/>}
      </SubShell>
    )
  }

  // HELP
  if (screen === S.HELP) {
    const faqs = [
      {q:'How do I earn GreenCoins?',       a:'Upload photos of your recyclables. After manual verification (within 24h), coins are credited to your account.'},
      {q:'What materials are accepted?',     a:'Currently: aluminium cans, plastic bottles, cardboard, and e-waste. More materials coming soon!'},
      {q:'How long does verification take?', a:"Our team verifies uploads within 24 hours. You'll get a notification once approved or rejected."},
      {q:'How do I redeem rewards?',         a:'Go to Rewards, choose a voucher, tap Redeem. The coupon code will appear — show it at the partner store.'},
      {q:'What is a Drop Point?',            a:'Partner locations (cafes, gyms, stores) where you can physically drop off your recyclables in exchange for GreenCoins.'},
    ]
    return (
      <SubShell title="Help & Support" sub="FAQ and contact">
        <div className="sec">
          <div className="sec-hd"><h3>Frequently Asked Questions</h3></div>
          <div className="faq-list">
            {faqs.map((f,i)=>(
              <div key={i} className="faq-item" onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                <div className="faq-q">
                  <span>{f.q}</span>
                  <span className={`faq-arrow ${openFaq===i?'open':''}`}><ChevronRight size={16}/></span>
                </div>
                {openFaq===i&&<div className="faq-a">{f.a}</div>}
              </div>
            ))}
          </div>
          <div className="sec-hd" style={{marginTop:20}}><h3>Contact Us</h3></div>
          <div className="card-stack">
            <div className="contact-card" onClick={()=>showToast('Opening WhatsApp…')}>
              <div className="contact-ico" style={{background:'#D1FAE5'}}>💬</div>
              <div className="contact-info"><div className="contact-t">WhatsApp Support</div><div className="contact-s">+91 98765 43210 · Typically replies in 1h</div></div>
              <ChevronRight size={15} color="var(--sub)"/>
            </div>
            <div className="contact-card" onClick={()=>showToast('Opening email…')}>
              <div className="contact-ico" style={{background:'#DBEAFE'}}>📧</div>
              <div className="contact-info"><div className="contact-t">Email Support</div><div className="contact-s">support@reloop.in</div></div>
              <ChevronRight size={15} color="var(--sub)"/>
            </div>
          </div>
        </div>
        {toast&&<Toast/>}
      </SubShell>
    )
  }

  // EDIT PROFILE
  if (screen === S.EDIT_PROFILE) return (
    <SubShell title="Edit Profile" sub="Update your information">
      <div className="sec">
        <div className="ep-avatar-row">
          <div className="ep-avatar" style={{fontSize:profile?.avatar_url?.length<=2?44:undefined}}>
            {profile?.avatar_url || '🦊'}
          </div>
          <button className="ep-change-btn" onClick={()=>{
            const next = EMOJI_POOL[Math.floor(Math.random()*EMOJI_POOL.length)]
            setProfile(p=>({...p, avatar_url: next}))
            supabase.from('users').update({avatar_url:next}).eq('id',authUser.id)
          }}>🔄 Change Avatar</button>
        </div>
        <div className="form-stack" style={{marginTop:20}}>
          <div>
            <label className="fld-lbl">Full Name</label>
            <input className="input" value={editName} onChange={e=>setEditName(e.target.value)}/>
          </div>
          <div>
            <label className="fld-lbl">City</label>
            <select className="input" value={editCity} onChange={e=>setEditCity(e.target.value)}
              style={{appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',paddingRight:36}}>
              {CITIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="fld-lbl">I am</label>
            <div style={{display:'flex',gap:10,marginTop:6}}>
              {[['male','👨 Male'],['female','👩 Female'],['other','🧑 Other']].map(([val,label])=>(
                <button key={val} onClick={()=>setEditGender(val)} style={{
                  flex:1,padding:'10px 0',borderRadius:12,fontSize:13,fontWeight:600,
                  border:editGender===val?'2px solid var(--green)':'1.5px solid var(--border)',
                  background:editGender===val?'var(--green-l)':'var(--card)',
                  color:editGender===val?'var(--green)':'var(--sub)',cursor:'pointer'
                }}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="fld-lbl">Email</label>
            <input className="input" value={authUser?.email || ''} readOnly style={{opacity:.6}}/>
          </div>
          <button className="btn btn-g btn-full" onClick={saveProfile}>Save Changes</button>
        </div>
      </div>
      {toast&&<Toast/>}
    </SubShell>
  )

  // NOTIFICATIONS
  if (screen === S.NOTIFICATIONS) {
    const notifRows = userNotifs.length > 0 ? userNotifs : []
    const emojiMap = { upload:'🥫', reward:'🎁', badge:'🏅', challenge:'🏅', referral:'🤝', pickup:'🚛' }
    return (
      <SubShell title="Notifications" sub="Recent activity">
        <div className="sec">
          {notifRows.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--sub)'}}>
              <div style={{fontSize:48,marginBottom:12}}>🔔</div>
              <div style={{fontSize:15,fontWeight:600}}>No notifications yet</div>
              <div style={{fontSize:13,marginTop:4}}>You'll see upload approvals and updates here</div>
            </div>
          ) : (
            <div className="card-stack">
              {notifRows.map((n,i)=>(
                <div key={i} className={`notif-row ${!n.is_read?'unread':''}`}>
                  <div className="notif-ico">{n.emoji || emojiMap[n.ref_type] || '🔔'}</div>
                  <div className="notif-info">
                    <div className="notif-title">{n.title}</div>
                    <div className="notif-sub">{n.body}</div>
                    <div className="notif-time">{new Date(n.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                  {!n.is_read && <div className="notif-dot"/>}
                </div>
              ))}
            </div>
          )}
        </div>
      </SubShell>
    )
  }

  return null
}
