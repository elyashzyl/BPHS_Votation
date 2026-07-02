const ELECTION_TYPES = ["sbo", "classroom", "club"];

export function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizedElectionType(type) {
  return ELECTION_TYPES.includes(type) ? type : "sbo";
}

export function candidateHasVotes(data, candidateId) {
  return (data?.votes || []).some((vote) => vote.candidateId === candidateId);
}

export function positionHasVotes(data, positionId) {
  return (data?.votes || []).some((vote) => vote.positionId === positionId);
}

export function activePositions(data, type) {
  return (data?.positions || [])
    .filter((position) => !position.archived)
    .filter((position) => normalizedElectionType(position.type) === normalizedElectionType(type))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

export function scopedCandidates(data, position, voter = {}) {
  const all = (data?.candidates || []).filter(
    (candidate) => candidate.positionId === position.id && !candidate.archived,
  );

  const type = normalizedElectionType(position.type);
  if (type === "classroom") {
    return all.filter((candidate) => !candidate.section || candidate.section === voter.section);
  }
  if (type === "club") {
    return all.filter((candidate) => !candidate.club || candidate.club === voter.club);
  }
  // For representative positions, show all candidates regardless of grade
  // This allows all students to vote for all grade representatives
  if (position.filterByGrade) {
    return all;
  }
  return all;
}

export function validatePositionInput(fields = {}) {
  const name = String(fields.name || "").trim();
  const type = normalizedElectionType(fields.type);
  const order = Math.max(1, Number(fields.order) || 1);
  const maxVote = Math.max(1, Number(fields.maxVote) || 1);

  if (!name) return { ok: false, error: "Position name is required." };

  return {
    ok: true,
    value: {
      name,
      type,
      order,
      maxVote,
      filterByGrade: !!fields.filterByGrade,
    },
  };
}

export function validateCandidateInput(data, fields = {}) {
  const name = String(fields.name || "").trim();
  const position = (data?.positions || []).find((item) => item.id === fields.positionId);

  if (!position) return { ok: false, error: "Candidate position is required." };
  if (!name) return { ok: false, error: "Candidate name is required." };
  if (position.archived) return { ok: false, error: "Cannot add candidates to an archived position." };

  return {
    ok: true,
    value: {
      positionId: position.id,
      name,
      grade: String(fields.grade || ""),
      section: normalizedElectionType(position.type) === "classroom" ? String(fields.section || "") : "",
      party: String(fields.party || "").trim(),
      club: normalizedElectionType(position.type) === "club" ? String(fields.club || "") : "",
      image: fields.image || "",
    },
  };
}

export function archiveOrDeletePosition(data, positionId) {
  if (!data) return { action: "none" };
  if (positionHasVotes(data, positionId)) {
    data.positions = data.positions.map((position) =>
      position.id === positionId
        ? { ...position, archived: true, archivedAt: new Date().toISOString() }
        : position,
    );
    data.candidates = data.candidates.map((candidate) =>
      candidate.positionId === positionId
        ? { ...candidate, archived: true, archivedAt: candidate.archivedAt || new Date().toISOString() }
        : candidate,
    );
    return { action: "archived" };
  }

  data.positions = data.positions.filter((position) => position.id !== positionId);
  data.candidates = data.candidates.filter((candidate) => candidate.positionId !== positionId);
  data.votes = data.votes.filter((vote) => vote.positionId !== positionId);
  return { action: "deleted" };
}

export function archiveOrDeleteCandidate(data, candidateId) {
  if (!data) return { action: "none" };
  if (candidateHasVotes(data, candidateId)) {
    data.candidates = data.candidates.map((candidate) =>
      candidate.id === candidateId
        ? { ...candidate, archived: true, archivedAt: new Date().toISOString() }
        : candidate,
    );
    return { action: "archived" };
  }

  data.candidates = data.candidates.filter((candidate) => candidate.id !== candidateId);
  data.votes = data.votes.filter((vote) => vote.candidateId !== candidateId);
  return { action: "deleted" };
}

export function restorePosition(data, positionId) {
  if (!data) return;
  data.positions = data.positions.map((position) =>
    position.id === positionId ? { ...position, archived: false, archivedAt: "" } : position,
  );
}

export function restoreCandidate(data, candidateId) {
  if (!data) return;
  data.candidates = data.candidates.map((candidate) =>
    candidate.id === candidateId ? { ...candidate, archived: false, archivedAt: "" } : candidate,
  );
}

export function selectedCount(selectedVotes = {}, positions = []) {
  return positions.reduce((count, position) => count + ((selectedVotes[position.id] || []).length ? 1 : 0), 0);
}

export function validateBallotSelections(data, type, voter, selectedVotes = {}) {
  const positions = activePositions(data, type);

  for (const position of positions) {
    const selectedIds = selectedVotes[position.id] || [];
    if (selectedIds.length > Number(position.maxVote || 1)) {
      return { ok: false, error: `${position.name} allows up to ${position.maxVote} vote(s).` };
    }

    const allowedIds = new Set(scopedCandidates(data, position, voter).map((candidate) => candidate.id));
    const invalid = selectedIds.find((id) => !allowedIds.has(id));
    if (invalid) {
      return { ok: false, error: `A selected candidate for ${position.name} is no longer available.` };
    }
  }

  return { ok: true };
}

export function tallyResults(data) {
  const positions = [...(data?.positions || [])].sort(
    (a, b) => normalizedElectionType(a.type).localeCompare(normalizedElectionType(b.type)) || Number(a.order || 0) - Number(b.order || 0),
  );
  const votes = data?.votes || [];

  return positions.reduce((summary, position) => {
    const candidates = (data?.candidates || [])
      .filter((candidate) => candidate.positionId === position.id)
      .map((candidate) => ({
        ...candidate,
        votes: votes.filter((vote) => vote.candidateId === candidate.id).length,
      }))
      .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));

    const topVotes = candidates[0]?.votes || 0;
    summary[position.id] = {
      ...position,
      totalVotes: votes.filter((vote) => vote.positionId === position.id).length,
      candidates,
      winners: candidates
        .filter((candidate) => topVotes > 0 && candidate.votes === topVotes)
        .slice(0, Number(position.maxVote || 1)),
      tied: candidates.filter((candidate) => topVotes > 0 && candidate.votes === topVotes).length > Number(position.maxVote || 1),
    };
    return summary;
  }, {});
}
