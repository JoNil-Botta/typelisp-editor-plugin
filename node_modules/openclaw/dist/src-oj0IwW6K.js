import { $ as NodeInvokeParamsSchema, $n as TalkSessionSteerParamsSchema, $r as SkillsUploadChunkParamsSchema, $t as EnvironmentsListParamsSchema, A as SessionsPatchParamsSchema, Bn as TalkConfigParamsSchema, Br as SkillsProposalReviseParamsSchema, Bt as DevicePairRejectParamsSchema, C as SessionsCompactionRestoreParamsSchema, Cn as UpdateStatusParamsSchema, Cr as AgentsListParamsSchema, Ct as ChatSendParamsSchema, D as SessionsListParamsSchema, Dn as ChannelsLogoutParamsSchema, Dr as ModelsListParamsSchema, E as SessionsDescribeParamsSchema, Et as ConnectParamsSchema, F as SessionsSendParamsSchema, Fn as TalkClientCreateParamsSchema, Fr as SkillsProposalInspectParamsSchema, G as PluginsSessionActionParamsSchema, Gn as TalkSessionCancelOutputParamsSchema, Gt as ExecApprovalRequestParamsSchema, H as WebPushTestParamsSchema, Hn as TalkEventSchema, Hr as SkillsProposalsListParamsSchema, Ht as DeviceTokenRevokeParamsSchema, I as SessionsUsageParamsSchema, In as TalkClientCreateResultSchema, J as PluginApprovalRequestParamsSchema, Jn as TalkSessionCreateParamsSchema, Jr as SkillsSkillCardParamsSchema, Jt as ExecApprovalsNodeGetParamsSchema, K as PluginsSessionActionResultSchema, Kn as TalkSessionCancelTurnParamsSchema, Kr as SkillsSecurityVerdictsParamsSchema, Kt as ExecApprovalResolveParamsSchema, L as SecretsResolveParamsSchema, Ln as TalkClientSteerParamsSchema, M as SessionsPreviewParamsSchema, Mn as TalkAgentControlResultSchema, Mr as SkillsProposalActionParamsSchema, Mt as ResponseFrameSchema, N as SessionsResetParamsSchema, Nn as TalkCatalogParamsSchema, O as SessionsMessagesSubscribeParamsSchema, On as ChannelsStartParamsSchema, Or as SkillsBinsParamsSchema, Ot as EventFrameSchema, P as SessionsResolveParamsSchema, Pn as TalkCatalogResultSchema, Pr as SkillsProposalCreateParamsSchema, Q as NodeEventResultSchema, Qn as TalkSessionOkResultSchema, Qr as SkillsUploadBeginParamsSchema, R as SecretsResolveResultSchema, Rn as TalkClientToolCallParamsSchema, Rr as SkillsProposalRequestRevisionParamsSchema, Rt as DevicePairApproveParamsSchema, S as SessionsCompactionListParamsSchema, Sn as UpdateRunParamsSchema, St as ChatMetadataParamsSchema, T as SessionsDeleteParamsSchema, Tn as CommandsListParamsSchema, Tr as AgentsUpdateParamsSchema, U as WebPushUnsubscribeParamsSchema, Un as TalkModeParamsSchema, Ut as DeviceTokenRotateParamsSchema, V as WebPushSubscribeParamsSchema, Vn as TalkConfigResultSchema, Vr as SkillsProposalUpdateParamsSchema, Vt as DevicePairRemoveParamsSchema, W as WebPushVapidPublicKeyParamsSchema, Wn as TalkSessionAppendAudioParamsSchema, Wr as SkillsSearchParamsSchema, Wt as ExecApprovalGetParamsSchema, X as NodeDescribeParamsSchema, Xn as TalkSessionJoinParamsSchema, Xr as SkillsStatusParamsSchema, Xt as ExecApprovalsSetParamsSchema, Y as PluginApprovalResolveParamsSchema, Yn as TalkSessionCreateResultSchema, Yt as ExecApprovalsNodeSetParamsSchema, Z as NodeEventParamsSchema, Zn as TalkSessionJoinResultSchema, Zr as SkillsUpdateParamsSchema, _ as SessionsAbortParamsSchema, _n as ConfigSchemaLookupParamsSchema, _r as AgentsFilesGetParamsSchema, _t as ChatEventSchema, a as WizardStartParamsSchema, ai as AgentIdentityParamsSchema, an as CronAddParamsSchema, ar as WebLoginStartParamsSchema, at as NodePairRemoveParamsSchema, b as SessionsCompactionBranchParamsSchema, bt as ChatMessageGetParamsSchema, ci as AgentWaitParamsSchema, cn as CronListParamsSchema, cr as ArtifactsDownloadParamsSchema, ct as NodePendingAckParamsSchema, d as TasksCancelParamsSchema, di as SendParamsSchema, dn as CronRunsParamsSchema, dt as NodePendingEnqueueParamsSchema, ei as SkillsUploadCommitParamsSchema, er as TalkSessionSubmitToolResultParamsSchema, et as NodeInvokeResultParamsSchema, fi as WakeParamsSchema, fn as CronStatusParamsSchema, fr as AgentsCreateParamsSchema, gn as ConfigPatchParamsSchema, gt as ChatAbortParamsSchema, h as TasksListParamsSchema, hn as ConfigGetParamsSchema, ht as NodeRenameParamsSchema, ir as TalkSpeakResultSchema, it as NodePairRejectParamsSchema, j as SessionsPluginPatchParamsSchema, jn as ChannelsStopParamsSchema, jr as SkillsInstallParamsSchema, jt as RequestFrameSchema, k as SessionsMessagesUnsubscribeParamsSchema, kn as ChannelsStatusParamsSchema, kr as SkillsDetailParamsSchema, li as MessageActionParamsSchema, ln as CronRemoveParamsSchema, lr as ArtifactsGetParamsSchema, lt as NodePendingDrainParamsSchema, mn as ConfigApplyParamsSchema, mr as AgentsDeleteParamsSchema, n as WizardCancelParamsSchema, ni as ToolsEffectiveParamsSchema, nr as TalkSessionTurnResultSchema, nt as NodePairApproveParamsSchema, on as CronGetParamsSchema, or as WebLoginWaitParamsSchema, ot as NodePairRequestParamsSchema, p as TasksGetParamsSchema, pn as CronUpdateParamsSchema, pt as NodePresenceAlivePayloadSchema, q as PluginsUiDescriptorsParamsSchema, qn as TalkSessionCloseParamsSchema, qt as ExecApprovalsGetParamsSchema, r as WizardNextParamsSchema, ri as ToolsInvokeParamsSchema, rr as TalkSpeakParamsSchema, rt as NodePairListParamsSchema, s as WizardStatusParamsSchema, si as AgentParamsSchema, st as NodePairVerifyParamsSchema, ti as ToolsCatalogParamsSchema, tn as EnvironmentsStatusParamsSchema, tr as TalkSessionTurnParamsSchema, tt as NodeListParamsSchema, ui as PollParamsSchema, un as CronRunParamsSchema, ur as ArtifactsListParamsSchema, v as SessionsCleanupParamsSchema, vn as ConfigSchemaLookupResultSchema, vt as ChatHistoryParamsSchema, w as SessionsCreateParamsSchema, wt as LogsTailParamsSchema, x as SessionsCompactionGetParamsSchema, xn as ConfigSetParamsSchema, xr as AgentsFilesSetParamsSchema, xt as ChatMessageGetResultSchema, y as SessionsCompactParamsSchema, yn as ConfigSchemaParamsSchema, yr as AgentsFilesListParamsSchema, yt as ChatInjectParamsSchema, z as PushTestParamsSchema, zn as TalkClientToolCallResultSchema, zt as DevicePairListParamsSchema } from "./schema-BwaBORnA.js";
import { Compile } from "typebox/compile";
//#region packages/gateway-protocol/src/index.ts
function lazyCompile(schema) {
	let compiled;
	let errors = null;
	const getCompiled = () => {
		compiled ??= Compile(schema);
		return compiled;
	};
	const validate = ((data) => {
		const current = getCompiled();
		const valid = current.Check(data);
		errors = valid ? null : [...current.Errors(data)];
		return valid;
	});
	Object.defineProperties(validate, {
		errors: {
			configurable: true,
			enumerable: true,
			get: () => errors,
			set: (nextErrors) => {
				errors = nextErrors ?? null;
			}
		},
		schema: {
			configurable: true,
			enumerable: true,
			get: () => schema
		}
	});
	return validate;
}
const validateCommandsListParams = lazyCompile(CommandsListParamsSchema);
const validateConnectParams = lazyCompile(ConnectParamsSchema);
const validateRequestFrame = lazyCompile(RequestFrameSchema);
const validateResponseFrame = lazyCompile(ResponseFrameSchema);
const validateEventFrame = lazyCompile(EventFrameSchema);
const validateMessageActionParams = lazyCompile(MessageActionParamsSchema);
const validateSendParams = lazyCompile(SendParamsSchema);
const validatePollParams = lazyCompile(PollParamsSchema);
const validateAgentParams = lazyCompile(AgentParamsSchema);
const validateAgentIdentityParams = lazyCompile(AgentIdentityParamsSchema);
const validateAgentWaitParams = lazyCompile(AgentWaitParamsSchema);
const validateWakeParams = lazyCompile(WakeParamsSchema);
const validateAgentsListParams = lazyCompile(AgentsListParamsSchema);
const validateAgentsCreateParams = lazyCompile(AgentsCreateParamsSchema);
const validateAgentsUpdateParams = lazyCompile(AgentsUpdateParamsSchema);
const validateAgentsDeleteParams = lazyCompile(AgentsDeleteParamsSchema);
const validateAgentsFilesListParams = lazyCompile(AgentsFilesListParamsSchema);
const validateAgentsFilesGetParams = lazyCompile(AgentsFilesGetParamsSchema);
const validateAgentsFilesSetParams = lazyCompile(AgentsFilesSetParamsSchema);
const validateArtifactsListParams = lazyCompile(ArtifactsListParamsSchema);
const validateArtifactsGetParams = lazyCompile(ArtifactsGetParamsSchema);
const validateArtifactsDownloadParams = lazyCompile(ArtifactsDownloadParamsSchema);
const validateNodePairRequestParams = lazyCompile(NodePairRequestParamsSchema);
const validateNodePairListParams = lazyCompile(NodePairListParamsSchema);
const validateNodePairApproveParams = lazyCompile(NodePairApproveParamsSchema);
const validateNodePairRejectParams = lazyCompile(NodePairRejectParamsSchema);
const validateNodePairRemoveParams = lazyCompile(NodePairRemoveParamsSchema);
const validateNodePairVerifyParams = lazyCompile(NodePairVerifyParamsSchema);
const validateNodeRenameParams = lazyCompile(NodeRenameParamsSchema);
const validateNodeListParams = lazyCompile(NodeListParamsSchema);
const validateEnvironmentsListParams = lazyCompile(EnvironmentsListParamsSchema);
const validateEnvironmentsStatusParams = lazyCompile(EnvironmentsStatusParamsSchema);
const validateNodePendingAckParams = lazyCompile(NodePendingAckParamsSchema);
const validateNodeDescribeParams = lazyCompile(NodeDescribeParamsSchema);
const validateNodeInvokeParams = lazyCompile(NodeInvokeParamsSchema);
const validateNodeInvokeResultParams = lazyCompile(NodeInvokeResultParamsSchema);
const validateNodeEventParams = lazyCompile(NodeEventParamsSchema);
const validateNodeEventResult = lazyCompile(NodeEventResultSchema);
const validateNodePresenceAlivePayload = lazyCompile(NodePresenceAlivePayloadSchema);
const validateNodePendingDrainParams = lazyCompile(NodePendingDrainParamsSchema);
const validateNodePendingEnqueueParams = lazyCompile(NodePendingEnqueueParamsSchema);
const validatePushTestParams = lazyCompile(PushTestParamsSchema);
const validateWebPushVapidPublicKeyParams = lazyCompile(WebPushVapidPublicKeyParamsSchema);
const validateWebPushSubscribeParams = lazyCompile(WebPushSubscribeParamsSchema);
const validateWebPushUnsubscribeParams = lazyCompile(WebPushUnsubscribeParamsSchema);
const validateWebPushTestParams = lazyCompile(WebPushTestParamsSchema);
const validateSecretsResolveParams = lazyCompile(SecretsResolveParamsSchema);
const validateSecretsResolveResult = lazyCompile(SecretsResolveResultSchema);
const validateSessionsListParams = lazyCompile(SessionsListParamsSchema);
const validateSessionsCleanupParams = lazyCompile(SessionsCleanupParamsSchema);
const validateSessionsPreviewParams = lazyCompile(SessionsPreviewParamsSchema);
const validateSessionsDescribeParams = lazyCompile(SessionsDescribeParamsSchema);
const validateSessionsResolveParams = lazyCompile(SessionsResolveParamsSchema);
const validateSessionsCreateParams = lazyCompile(SessionsCreateParamsSchema);
const validateSessionsSendParams = lazyCompile(SessionsSendParamsSchema);
const validateSessionsMessagesSubscribeParams = lazyCompile(SessionsMessagesSubscribeParamsSchema);
const validateSessionsMessagesUnsubscribeParams = lazyCompile(SessionsMessagesUnsubscribeParamsSchema);
const validateSessionsAbortParams = lazyCompile(SessionsAbortParamsSchema);
const validateSessionsPatchParams = lazyCompile(SessionsPatchParamsSchema);
const validateSessionsPluginPatchParams = lazyCompile(SessionsPluginPatchParamsSchema);
const validateSessionsResetParams = lazyCompile(SessionsResetParamsSchema);
const validateSessionsDeleteParams = lazyCompile(SessionsDeleteParamsSchema);
const validateSessionsCompactParams = lazyCompile(SessionsCompactParamsSchema);
const validateSessionsCompactionListParams = lazyCompile(SessionsCompactionListParamsSchema);
const validateSessionsCompactionGetParams = lazyCompile(SessionsCompactionGetParamsSchema);
const validateSessionsCompactionBranchParams = lazyCompile(SessionsCompactionBranchParamsSchema);
const validateSessionsCompactionRestoreParams = lazyCompile(SessionsCompactionRestoreParamsSchema);
const validateSessionsUsageParams = lazyCompile(SessionsUsageParamsSchema);
const validateTasksListParams = lazyCompile(TasksListParamsSchema);
const validateTasksGetParams = lazyCompile(TasksGetParamsSchema);
const validateTasksCancelParams = lazyCompile(TasksCancelParamsSchema);
const validateConfigGetParams = lazyCompile(ConfigGetParamsSchema);
const validateConfigSetParams = lazyCompile(ConfigSetParamsSchema);
const validateConfigApplyParams = lazyCompile(ConfigApplyParamsSchema);
const validateConfigPatchParams = lazyCompile(ConfigPatchParamsSchema);
const validateConfigSchemaParams = lazyCompile(ConfigSchemaParamsSchema);
const validateConfigSchemaLookupParams = lazyCompile(ConfigSchemaLookupParamsSchema);
const validateConfigSchemaLookupResult = lazyCompile(ConfigSchemaLookupResultSchema);
const validateWizardStartParams = lazyCompile(WizardStartParamsSchema);
const validateWizardNextParams = lazyCompile(WizardNextParamsSchema);
const validateWizardCancelParams = lazyCompile(WizardCancelParamsSchema);
const validateWizardStatusParams = lazyCompile(WizardStatusParamsSchema);
const validateTalkModeParams = lazyCompile(TalkModeParamsSchema);
const validateTalkEvent = lazyCompile(TalkEventSchema);
const validateTalkCatalogParams = lazyCompile(TalkCatalogParamsSchema);
const validateTalkCatalogResult = lazyCompile(TalkCatalogResultSchema);
const validateTalkConfigParams = lazyCompile(TalkConfigParamsSchema);
const validateTalkConfigResult = lazyCompile(TalkConfigResultSchema);
const validateTalkClientCreateParams = lazyCompile(TalkClientCreateParamsSchema);
const validateTalkClientCreateResult = lazyCompile(TalkClientCreateResultSchema);
const validateTalkClientToolCallParams = lazyCompile(TalkClientToolCallParamsSchema);
const validateTalkClientToolCallResult = lazyCompile(TalkClientToolCallResultSchema);
const validateTalkClientSteerParams = lazyCompile(TalkClientSteerParamsSchema);
const validateTalkAgentControlResult = lazyCompile(TalkAgentControlResultSchema);
const validateTalkSessionCreateParams = lazyCompile(TalkSessionCreateParamsSchema);
const validateTalkSessionCreateResult = lazyCompile(TalkSessionCreateResultSchema);
const validateTalkSessionJoinParams = lazyCompile(TalkSessionJoinParamsSchema);
const validateTalkSessionJoinResult = lazyCompile(TalkSessionJoinResultSchema);
const validateTalkSessionAppendAudioParams = lazyCompile(TalkSessionAppendAudioParamsSchema);
const validateTalkSessionTurnParams = lazyCompile(TalkSessionTurnParamsSchema);
const validateTalkSessionCancelTurnParams = lazyCompile(TalkSessionCancelTurnParamsSchema);
const validateTalkSessionCancelOutputParams = lazyCompile(TalkSessionCancelOutputParamsSchema);
const validateTalkSessionTurnResult = lazyCompile(TalkSessionTurnResultSchema);
const validateTalkSessionSteerParams = lazyCompile(TalkSessionSteerParamsSchema);
const validateTalkSessionSubmitToolResultParams = lazyCompile(TalkSessionSubmitToolResultParamsSchema);
const validateTalkSessionCloseParams = lazyCompile(TalkSessionCloseParamsSchema);
const validateTalkSessionOkResult = lazyCompile(TalkSessionOkResultSchema);
const validateTalkSpeakParams = lazyCompile(TalkSpeakParamsSchema);
const validateTalkSpeakResult = lazyCompile(TalkSpeakResultSchema);
const validateChannelsStatusParams = lazyCompile(ChannelsStatusParamsSchema);
const validateChannelsStartParams = lazyCompile(ChannelsStartParamsSchema);
const validateChannelsStopParams = lazyCompile(ChannelsStopParamsSchema);
const validateChannelsLogoutParams = lazyCompile(ChannelsLogoutParamsSchema);
const validateModelsListParams = lazyCompile(ModelsListParamsSchema);
const validateSkillsStatusParams = lazyCompile(SkillsStatusParamsSchema);
const validateToolsCatalogParams = lazyCompile(ToolsCatalogParamsSchema);
const validateToolsEffectiveParams = lazyCompile(ToolsEffectiveParamsSchema);
const validateToolsInvokeParams = lazyCompile(ToolsInvokeParamsSchema);
const validateSkillsBinsParams = lazyCompile(SkillsBinsParamsSchema);
const validateSkillsInstallParams = lazyCompile(SkillsInstallParamsSchema);
const validateSkillsUploadBeginParams = lazyCompile(SkillsUploadBeginParamsSchema);
const validateSkillsUploadChunkParams = lazyCompile(SkillsUploadChunkParamsSchema);
const validateSkillsUploadCommitParams = lazyCompile(SkillsUploadCommitParamsSchema);
const validateSkillsUpdateParams = lazyCompile(SkillsUpdateParamsSchema);
const validateSkillsSearchParams = lazyCompile(SkillsSearchParamsSchema);
const validateSkillsDetailParams = lazyCompile(SkillsDetailParamsSchema);
const validateSkillsProposalsListParams = lazyCompile(SkillsProposalsListParamsSchema);
const validateSkillsProposalInspectParams = lazyCompile(SkillsProposalInspectParamsSchema);
const validateSkillsProposalCreateParams = lazyCompile(SkillsProposalCreateParamsSchema);
const validateSkillsProposalUpdateParams = lazyCompile(SkillsProposalUpdateParamsSchema);
const validateSkillsProposalReviseParams = lazyCompile(SkillsProposalReviseParamsSchema);
const validateSkillsProposalRequestRevisionParams = lazyCompile(SkillsProposalRequestRevisionParamsSchema);
const validateSkillsProposalActionParams = lazyCompile(SkillsProposalActionParamsSchema);
const validateSkillsSecurityVerdictsParams = lazyCompile(SkillsSecurityVerdictsParamsSchema);
const validateSkillsSkillCardParams = lazyCompile(SkillsSkillCardParamsSchema);
const validateCronListParams = lazyCompile(CronListParamsSchema);
const validateCronStatusParams = lazyCompile(CronStatusParamsSchema);
const validateCronGetParams = lazyCompile(CronGetParamsSchema);
const validateCronAddParams = lazyCompile(CronAddParamsSchema);
const validateCronUpdateParams = lazyCompile(CronUpdateParamsSchema);
const validateCronRemoveParams = lazyCompile(CronRemoveParamsSchema);
const validateCronRunParams = lazyCompile(CronRunParamsSchema);
const validateCronRunsParams = lazyCompile(CronRunsParamsSchema);
const validateDevicePairListParams = lazyCompile(DevicePairListParamsSchema);
const validateDevicePairApproveParams = lazyCompile(DevicePairApproveParamsSchema);
const validateDevicePairRejectParams = lazyCompile(DevicePairRejectParamsSchema);
const validateDevicePairRemoveParams = lazyCompile(DevicePairRemoveParamsSchema);
const validateDeviceTokenRotateParams = lazyCompile(DeviceTokenRotateParamsSchema);
const validateDeviceTokenRevokeParams = lazyCompile(DeviceTokenRevokeParamsSchema);
const validateExecApprovalsGetParams = lazyCompile(ExecApprovalsGetParamsSchema);
const validateExecApprovalsSetParams = lazyCompile(ExecApprovalsSetParamsSchema);
const validateExecApprovalGetParams = lazyCompile(ExecApprovalGetParamsSchema);
const validateExecApprovalRequestParams = lazyCompile(ExecApprovalRequestParamsSchema);
const validateExecApprovalResolveParams = lazyCompile(ExecApprovalResolveParamsSchema);
const validatePluginApprovalRequestParams = lazyCompile(PluginApprovalRequestParamsSchema);
const validatePluginApprovalResolveParams = lazyCompile(PluginApprovalResolveParamsSchema);
const validatePluginsUiDescriptorsParams = lazyCompile(PluginsUiDescriptorsParamsSchema);
const validatePluginsSessionActionParams = lazyCompile(PluginsSessionActionParamsSchema);
const validatePluginsSessionActionResult = lazyCompile(PluginsSessionActionResultSchema);
const validateExecApprovalsNodeGetParams = lazyCompile(ExecApprovalsNodeGetParamsSchema);
const validateExecApprovalsNodeSetParams = lazyCompile(ExecApprovalsNodeSetParamsSchema);
const validateLogsTailParams = lazyCompile(LogsTailParamsSchema);
const validateChatHistoryParams = lazyCompile(ChatHistoryParamsSchema);
const validateChatMetadataParams = lazyCompile(ChatMetadataParamsSchema);
const validateChatMessageGetParams = lazyCompile(ChatMessageGetParamsSchema);
const validateChatSendParams = lazyCompile(ChatSendParamsSchema);
const validateChatAbortParams = lazyCompile(ChatAbortParamsSchema);
const validateChatInjectParams = lazyCompile(ChatInjectParamsSchema);
const validateChatEvent = lazyCompile(ChatEventSchema);
const validateChatMessageGetResult = lazyCompile(ChatMessageGetResultSchema);
const validateUpdateStatusParams = lazyCompile(UpdateStatusParamsSchema);
const validateUpdateRunParams = lazyCompile(UpdateRunParamsSchema);
const validateWebLoginStartParams = lazyCompile(WebLoginStartParamsSchema);
const validateWebLoginWaitParams = lazyCompile(WebLoginWaitParamsSchema);
function firstStringParam(value) {
	if (typeof value === "string" && value.trim()) return value;
	if (Array.isArray(value)) return value.find((entry) => typeof entry === "string" && entry.trim().length > 0);
}
/** Convert validator errors into compact operator-facing failure text. */
function formatValidationErrors(errors) {
	if (!errors?.length) return "unknown validation error";
	const parts = [];
	for (const err of errors) {
		const keyword = typeof err?.keyword === "string" ? err.keyword : "";
		const instancePath = typeof err?.instancePath === "string" ? err.instancePath : "";
		if (keyword === "additionalProperties") {
			const additionalProperty = firstStringParam(err?.params?.additionalProperty) ?? firstStringParam(err?.params?.additionalProperties);
			if (additionalProperty) {
				const where = instancePath ? `at ${instancePath}` : "at root";
				parts.push(`${where}: unexpected property '${additionalProperty}'`);
				continue;
			}
		}
		if (keyword === "required") {
			const missingProperty = firstStringParam(err?.params?.missingProperty) ?? firstStringParam(err?.params?.requiredProperties);
			if (missingProperty) {
				const where = instancePath ? `at ${instancePath}: ` : "";
				parts.push(`${where}must have required property '${missingProperty}'`);
				continue;
			}
		}
		const failingKeyword = typeof err?.params?.failingKeyword === "string" ? err.params.failingKeyword : "";
		const message = keyword === "then" || keyword === "if" && failingKeyword === "then" ? "must have required conditional properties" : typeof err?.message === "string" && err.message.trim() ? err.message : "validation error";
		const where = instancePath ? `at ${instancePath}: ` : "";
		parts.push(`${where}${message}`);
	}
	const unique = uniqueStrings(parts.filter((part) => part.trim()));
	if (!unique.length) return "unknown validation error";
	return unique.join("; ");
}
function uniqueStrings(values) {
	return [...new Set(values)];
}
//#endregion
export { validateExecApprovalGetParams as $, validateToolsEffectiveParams as $n, validateSessionsPreviewParams as $t, validateConfigPatchParams as A, validateTalkConfigParams as An, validatePluginsUiDescriptorsParams as At, validateCronRunParams as B, validateTalkSessionJoinParams as Bn, validateSessionsCompactParams as Bt, validateChatMessageGetParams as C, validateTalkCatalogParams as Cn, validateNodePendingEnqueueParams as Ct, validateCommandsListParams as D, validateTalkClientSteerParams as Dn, validatePluginApprovalResolveParams as Dt, validateChatSendParams as E, validateTalkClientCreateResult as En, validatePluginApprovalRequestParams as Et, validateConnectParams as F, validateTalkSessionCancelOutputParams as Fn, validateSecretsResolveParams as Ft, validateDevicePairListParams as G, validateTalkSessionTurnParams as Gn, validateSessionsCreateParams as Gt, validateCronStatusParams as H, validateTalkSessionOkResult as Hn, validateSessionsCompactionGetParams as Ht, validateCronAddParams as I, validateTalkSessionCancelTurnParams as In, validateSecretsResolveResult as It, validateDeviceTokenRevokeParams as J, validateTalkSpeakResult as Jn, validateSessionsListParams as Jt, validateDevicePairRejectParams as K, validateTalkSessionTurnResult as Kn, validateSessionsDeleteParams as Kt, validateCronGetParams as L, validateTalkSessionCloseParams as Ln, validateSendParams as Lt, validateConfigSchemaLookupResult as M, validateTalkEvent as Mn, validatePushTestParams as Mt, validateConfigSchemaParams as N, validateTalkModeParams as Nn, validateRequestFrame as Nt, validateConfigApplyParams as O, validateTalkClientToolCallParams as On, validatePluginsSessionActionParams as Ot, validateConfigSetParams as P, validateTalkSessionAppendAudioParams as Pn, validateResponseFrame as Pt, validateEventFrame as Q, validateToolsCatalogParams as Qn, validateSessionsPluginPatchParams as Qt, validateCronListParams as R, validateTalkSessionCreateParams as Rn, validateSessionsAbortParams as Rt, validateChatInjectParams as S, validateTalkAgentControlResult as Sn, validateNodePendingDrainParams as St, validateChatMetadataParams as T, validateTalkClientCreateParams as Tn, validateNodeRenameParams as Tt, validateCronUpdateParams as U, validateTalkSessionSteerParams as Un, validateSessionsCompactionListParams as Ut, validateCronRunsParams as V, validateTalkSessionJoinResult as Vn, validateSessionsCompactionBranchParams as Vt, validateDevicePairApproveParams as W, validateTalkSessionSubmitToolResultParams as Wn, validateSessionsCompactionRestoreParams as Wt, validateEnvironmentsListParams as X, validateTasksGetParams as Xn, validateSessionsMessagesUnsubscribeParams as Xt, validateDeviceTokenRotateParams as Y, validateTasksCancelParams as Yn, validateSessionsMessagesSubscribeParams as Yt, validateEnvironmentsStatusParams as Z, validateTasksListParams as Zn, validateSessionsPatchParams as Zt, validateChannelsStatusParams as _, validateSkillsStatusParams as _n, validateNodePairRejectParams as _t, validateAgentsCreateParams as a, validateSkillsDetailParams as an, validateWebLoginWaitParams as ar, validateExecApprovalsSetParams as at, validateChatEvent as b, validateSkillsUploadChunkParams as bn, validateNodePairVerifyParams as bt, validateAgentsFilesListParams as c, validateSkillsProposalCreateParams as cn, validateWebPushUnsubscribeParams as cr, validateModelsListParams as ct, validateAgentsUpdateParams as d, validateSkillsProposalReviseParams as dn, validateWizardNextParams as dr, validateNodeEventResult as dt, validateSessionsResetParams as en, validateToolsInvokeParams as er, validateExecApprovalRequestParams as et, validateArtifactsDownloadParams as f, validateSkillsProposalUpdateParams as fn, validateWizardStartParams as fr, validateNodeInvokeParams as ft, validateChannelsStartParams as g, validateSkillsSkillCardParams as gn, validateNodePairListParams as gt, validateChannelsLogoutParams as h, validateSkillsSecurityVerdictsParams as hn, validateNodePairApproveParams as ht, validateAgentWaitParams as i, validateSkillsBinsParams as in, validateWebLoginStartParams as ir, validateExecApprovalsNodeSetParams as it, validateConfigSchemaLookupParams as j, validateTalkConfigResult as jn, validatePollParams as jt, validateConfigGetParams as k, validateTalkClientToolCallResult as kn, validatePluginsSessionActionResult as kt, validateAgentsFilesSetParams as l, validateSkillsProposalInspectParams as ln, validateWebPushVapidPublicKeyParams as lr, validateNodeDescribeParams as lt, validateArtifactsListParams as m, validateSkillsSearchParams as mn, validateNodeListParams as mt, validateAgentIdentityParams as n, validateSessionsSendParams as nn, validateUpdateStatusParams as nr, validateExecApprovalsGetParams as nt, validateAgentsDeleteParams as o, validateSkillsInstallParams as on, validateWebPushSubscribeParams as or, validateLogsTailParams as ot, validateArtifactsGetParams as p, validateSkillsProposalsListParams as pn, validateWizardStatusParams as pr, validateNodeInvokeResultParams as pt, validateDevicePairRemoveParams as q, validateTalkSpeakParams as qn, validateSessionsDescribeParams as qt, validateAgentParams as r, validateSessionsUsageParams as rn, validateWakeParams as rr, validateExecApprovalsNodeGetParams as rt, validateAgentsFilesGetParams as s, validateSkillsProposalActionParams as sn, validateWebPushTestParams as sr, validateMessageActionParams as st, formatValidationErrors as t, validateSessionsResolveParams as tn, validateUpdateRunParams as tr, validateExecApprovalResolveParams as tt, validateAgentsListParams as u, validateSkillsProposalRequestRevisionParams as un, validateWizardCancelParams as ur, validateNodeEventParams as ut, validateChannelsStopParams as v, validateSkillsUpdateParams as vn, validateNodePairRemoveParams as vt, validateChatMessageGetResult as w, validateTalkCatalogResult as wn, validateNodePresenceAlivePayload as wt, validateChatHistoryParams as x, validateSkillsUploadCommitParams as xn, validateNodePendingAckParams as xt, validateChatAbortParams as y, validateSkillsUploadBeginParams as yn, validateNodePairRequestParams as yt, validateCronRemoveParams as z, validateTalkSessionCreateResult as zn, validateSessionsCleanupParams as zt };
