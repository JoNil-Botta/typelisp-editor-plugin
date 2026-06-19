//#region src/commands/doctor-skills-core.ts
/** Returns allowed skills that are unusable in the current runtime environment. */
function collectUnavailableAgentSkills(report) {
	return report.skills.filter((skill) => !skill.eligible && !skill.disabled && !skill.blockedByAllowlist && !skill.blockedByAgentFilter);
}
/** Disables unavailable skills in config while preserving existing skill entries. */
function disableUnavailableSkillsInConfig(config, skills) {
	if (skills.length === 0) return config;
	const entries = { ...config.skills?.entries };
	for (const skill of skills) entries[skill.skillKey] = {
		...entries[skill.skillKey],
		enabled: false
	};
	return {
		...config,
		skills: {
			...config.skills,
			entries
		}
	};
}
//#endregion
export { disableUnavailableSkillsInConfig as n, collectUnavailableAgentSkills as t };
