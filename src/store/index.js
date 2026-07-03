import { reactive } from 'vue'
import { DB } from '../db/index.js'
import { Device } from '../utils/device.js'

export function freshData() {
  return {
    positions: [
      { id: 'pos_president', name: 'SBO President', order: 1, maxVote: 1, type: 'sbo' },
      { id: 'pos_vp', name: 'Vice President', order: 2, maxVote: 1, type: 'sbo' },
      { id: 'pos_secretary', name: 'Secretary', order: 3, maxVote: 1, type: 'sbo' },
      { id: 'pos_treasurer', name: 'Treasurer', order: 4, maxVote: 1, type: 'sbo' },
      { id: 'pos_auditor', name: 'Auditor', order: 5, maxVote: 1, type: 'sbo' },
      { id: 'pos_pro', name: 'Press Relations Officer (PRO)', order: 6, maxVote: 1, type: 'sbo' },
      { id: 'pos_male_sgt', name: 'Male Sergeant at Arms', order: 7, maxVote: 1, type: 'sbo' },
      { id: 'pos_female_sgt', name: 'Female Sergeant at Arms', order: 8, maxVote: 1, type: 'sbo' },
      { id: 'pos_g7_rep', name: 'Grade 7 Representative', order: 9, maxVote: 2, type: 'sbo', filterByGrade: true },
      { id: 'pos_g8_rep', name: 'Grade 8 Representative', order: 10, maxVote: 2, type: 'sbo', filterByGrade: true },
      { id: 'pos_g9_rep', name: 'Grade 9 Representative', order: 11, maxVote: 2, type: 'sbo', filterByGrade: true },
      { id: 'pos_g10_rep', name: 'Grade 10 Representative', order: 12, maxVote: 2, type: 'sbo', filterByGrade: true },
      { id: 'pos_chinese_rep', name: 'Chinese Representative', order: 13, maxVote: 1, type: 'sbo' },
    ],
    candidates: [
      { id: 'cand_pres_1', name: 'Bamboo Santiago', grade: '', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_president' },
      { id: 'cand_pres_2', name: 'Franchesca Cruz', grade: '', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_president' },
      { id: 'cand_vp_1', name: 'Mhonica Espanillo', grade: '', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_vp' },
      { id: 'cand_vp_2', name: 'Alessandra Tirona', grade: '', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_vp' },
      { id: 'cand_sec_1', name: 'Allison Kiangan', grade: '', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_secretary' },
      { id: 'cand_sec_2', name: 'Elaixiah Samson', grade: '', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_secretary' },
      { id: 'cand_treas_1', name: 'Rachenne Lestino', grade: '', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_treasurer' },
      { id: 'cand_treas_2', name: 'Dianessa Canillas', grade: '', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_treasurer' },
      { id: 'cand_aud_1', name: 'Ann Rhea Abance', grade: '', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_auditor' },
      { id: 'cand_aud_2', name: 'Danielle Ordinario', grade: '', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_auditor' },
      { id: 'cand_pro_1', name: 'Gianna Ayudoc', grade: '', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_pro' },
      { id: 'cand_pro_2', name: 'Shaun Delos Santos', grade: '', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_pro' },
      { id: 'cand_male_sgt_1', name: 'Joaquin Cabrera', grade: '', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_male_sgt' },
      { id: 'cand_male_sgt_2', name: 'Dominic Pascual', grade: '', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_male_sgt' },
      { id: 'cand_female_sgt_1', name: 'Rhea Saggot', grade: '', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_female_sgt' },
      { id: 'cand_female_sgt_2', name: 'Antonia Malla', grade: '', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_female_sgt' },
      { id: 'cand_g7_1', name: 'Amber Santos', grade: '7', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_g7_rep' },
      { id: 'cand_g7_2', name: 'Phoebe Bacoco', grade: '7', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_g7_rep' },
      { id: 'cand_g8_1', name: 'Yana Macabeo', grade: '8', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_g8_rep' },
      { id: 'cand_g8_2', name: 'Sydney Rodriguez', grade: '8', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_g8_rep' },
      { id: 'cand_g9_1', name: 'Prince Bannagaw', grade: '9', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_g9_rep' },
      { id: 'cand_g9_2', name: 'Aiyah De Guzman', grade: '9', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_g9_rep' },
      { id: 'cand_g10_1', name: 'Princess Santos', grade: '10', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_g10_rep' },
      { id: 'cand_g10_2', name: 'Rhiann Dagdagan', grade: '10', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_g10_rep' },
      { id: 'cand_chinese_1', name: 'Austin Correos', grade: '', section: '', party: 'ASPIRANTS', club: '', image: '', positionId: 'pos_chinese_rep' },
      { id: 'cand_chinese_2', name: 'Angelynna Weng', grade: '', section: '', party: 'AURORA', club: '', image: '', positionId: 'pos_chinese_rep' },
    ],
    voters: [],
    votes: [],
    votedDevices: [],
    reports: [],
    settings: {
      title: 'SBO Election',
      sboActive: true,
      classroomActive: true,
      clubActive: true,
      adminPassword: 'admin123',
      grades: ['7', '8', '9', '10'],
      sectionsByGrade: {
        '7': ['Pine', 'Molave'],
        '8': ['Cypress'],
        '9': ['Kamagong', 'Mahogany'],
        '10': ['Acacia', 'Yakal'],
      },
      clubs: ['English Club', 'Science Club', 'Math Club'],
    },
  }
}

export const state = reactive({
  year: String(new Date().getFullYear()),
  years: [],
  data: null,
  loading: true,
  isDark: document.documentElement.getAttribute('data-theme') === 'dark',
  voter: { name: '', grade: '7', section: '' },
  electionType: 'sbo',
  selectedVotes: {},
  loginError: '',
  adminPass: '',
  adminLoginError: '',
  adminView: 'dashboard',
  isAdmin: false,
  candTabPosId: null,
  candTabType: 'sbo',
  logFilter: { grade: '', section: '' },
  settingsForm: { title: '', adminPassword: '', sboActive: true, classroomActive: true, clubActive: true, gradesStr: '', sectionsByGradeStr: {}, clubsStr: '' },
})

export function toggleTheme() {
  state.isDark = !state.isDark
  const t = state.isDark ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('sbo_theme', t)
}

export function getPositions() {
  return state.data ? [...state.data.positions].sort((a, b) => a.order - b.order) : []
}

export function getPositionsByType(type) {
  return getPositions().filter(p => (p.type || 'sbo') === type)
}

export function getCandidates(posId) {
  return state.data ? state.data.candidates.filter(c => c.positionId === posId) : []
}

export function getAllCandidates() {
  return state.data ? [...state.data.candidates] : []
}

export function getSettings() {
  return state.data ? state.data.settings : {}
}

export function getVoters() {
  return state.data ? [...state.data.voters] : []
}

export function getVotes() {
  return state.data ? [...state.data.votes] : []
}

export function getStats() {
  if (!state.data) return { totalVoters: 0, totalVotes: 0, positions: {} }
  const positions = getPositions()
  const s = { totalVoters: state.data.voters.length, totalVotes: state.data.votes.length, positions: {} }
  positions.forEach(p => {
    const votes = state.data.votes.filter(v => v.positionId === p.id)
    const candidates = state.data.candidates.filter(c => c.positionId === p.id)
    s.positions[p.id] = {
      name: p.name, totalVotes: votes.length,
      candidates: candidates.map(c => ({ ...c, votes: votes.filter(v => v.candidateId === c.id).length })).sort((a, b) => b.votes - a.votes)
    }
  })
  return s
}

export function getFilteredVotes(filters = {}) {
  if (!state.data) return []
  let voters = [...state.data.voters]
  if (filters.grade) voters = voters.filter(v => v.grade === filters.grade)
  if (filters.section) voters = voters.filter(v => v.section === filters.section)
  const ids = new Set(voters.map(v => v.id))
  return state.data.votes.filter(v => ids.has(v.voterId)).map(v => {
    const voter = state.data.voters.find(x => x.id === v.voterId) || {}
    const candidate = state.data.candidates.find(x => x.id === v.candidateId) || {}
    const position = state.data.positions.find(x => x.id === v.positionId) || {}
    return { voterName: voter.name || '', grade: voter.grade || '', section: voter.section || '', candidateName: candidate.name || '', positionName: position.name || '', timestamp: v.timestamp }
  })
}

export function getSections(grade) {
  return state.data?.settings?.sectionsByGrade?.[grade] || []
}

export function getAllSections() {
  if (!state.data) return []
  const all = []
  const g = state.data.settings.grades || []
  g.forEach(g => { (state.data.settings.sectionsByGrade?.[g] || []).forEach(s => { if (!all.includes(s)) all.push(s) }) })
  return all
}

export function getClubs() {
  return state.data?.settings?.clubs || []
}

export function getReports() {
  return state.data?.reports ? [...state.data.reports].reverse() : []
}

export async function submitReport(name, message) {
  if (!state.data || !message?.trim()) return
  if (!state.data.reports) state.data.reports = []
  state.data.reports.push({
    id: 'rpt_' + Date.now(),
    name: name?.trim() || 'Anonymous',
    message: message.trim(),
    electionType: state.electionType || '',
    deviceId: Device.getId(),
    resolved: false,
    reply: '',
    replyTimestamp: '',
    followUps: [],
    timestamp: new Date().toISOString()
  })
  await saveSync()
}

export function followUpReport(id, message) {
  const r = state.data?.reports?.find(x => x.id === id)
  if (r) {
    r.followUps = r.followUps || []
    r.followUps.push({ message: message.trim(), timestamp: new Date().toISOString() })
    saveSync()
  }
}

export function resolveReport(id) {
  const r = state.data?.reports?.find(x => x.id === id)
  if (r) { r.resolved = !r.resolved; if (state.data.reports) saveSync() }
}

export function replyToReport(id, reply) {
  const r = state.data?.reports?.find(x => x.id === id)
  if (r) { r.reply = reply?.trim() || ''; r.replyTimestamp = r.reply ? new Date().toISOString() : ''; if (state.data.reports) saveSync() }
}

export function removeReport(id) {
  if (state.data?.reports) { state.data.reports = state.data.reports.filter(x => x.id !== id); saveSync() }
}

export function editReport(id, fields) {
  const r = state.data?.reports?.find(x => x.id === id)
  if (r) { Object.assign(r, fields); saveSync() }
}

export function deviceVoted() {
  if (!state.data) return false
  const prefix = Device.getId() + ':'
  const count = state.data.votedDevices.filter(d => d.startsWith(prefix)).length
  return count >= 3
}

export function deviceVotedAny() {
  if (!state.data) return false
  const prefix = Device.getId() + ':'
  return state.data.votedDevices.filter(d => d.startsWith(prefix)).length >= 3
}

export async function saveSync() {
  if (state.data) {
    try { await DB.save(state.year, state.data) }
    catch (e) { console.error('saveSync failed:', e) }
  }
}

async function loadYear(year) {
  let data = await DB.get(year)
  if (!data) {
    data = freshData()
    await DB.save(year, data)
  }
  if (!data.settings.clubs) data.settings.clubs = ['English Club', 'Science Club', 'Math Club']
  if (!data.reports) data.reports = []
  if (!data.votedDevices) data.votedDevices = []
  /* Migrate: filterByGrade only for grade-specific rep; remove from all others */
  data.positions.forEach(p => {
    if (p.type === 'sbo' && /grade/i.test(p.name) && /representative/i.test(p.name)) {
      p.filterByGrade = true
    } else {
      delete p.filterByGrade
    }
  })
  state.year = year
  state.data = data
  state.years = await DB.list()
  const s = data.settings
  state.voter = { name: '', grade: s.grades[0] || '7', section: (s.sectionsByGrade?.[s.grades[0]] || [''])[0] || '', club: (s.clubs || [])[0] || '' }
  state.electionType = 'sbo'
  state.candTabType = 'sbo'
  state.selectedVotes = {}
  state.loginError = ''
  state.logFilter = { grade: '', section: '' }
}

export async function initApp() {
  try {
    await DB.open()
    state.years = await DB.list()
    const target = state.years.includes(state.year) ? state.year : (state.years[state.years.length - 1] || state.year)
    await loadYear(target)
    if (sessionStorage.getItem('sbo_admin')) {
      state.isAdmin = true
      state.adminView = sessionStorage.getItem('sbo_adminView') || 'dashboard'
    }
  } catch (e) {
    console.error('initApp failed:', e)
    /* If no data loaded, create fresh data so the UI isn't blank */
    if (!state.data) {
      state.data = freshData()
      state.year = String(new Date().getFullYear())
    }
  }
  state.loading = false
}

export async function switchYear(year) {
  state.loading = true
  await loadYear(year)
  state.adminView = 'dashboard'
  state.loading = false
}

export async function createNewYear(year) {
  if (!year || state.years.includes(year)) { alert('Year already exists or invalid.'); return }
  state.loading = true
  await DB.save(year, freshData())
  await loadYear(year)
  state.loading = false
}

export async function deleteAndSwitch(year) {
  await DB.remove(year)
  const yrs = await DB.list()
  if (yrs.length) await switchYear(yrs[yrs.length - 1])
  else await switchYear(String(new Date().getFullYear()))
}
