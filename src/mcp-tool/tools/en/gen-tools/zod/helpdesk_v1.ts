import { z } from 'zod';
export type helpdeskV1ToolName =
  | 'helpdesk.v1.agentSchedule.create'
  | 'helpdesk.v1.agentSchedule.list'
  | 'helpdesk.v1.agentSkillRule.list'
  | 'helpdesk.v1.agentSkill.create'
  | 'helpdesk.v1.agentSkill.delete'
  | 'helpdesk.v1.agentSkill.get'
  | 'helpdesk.v1.agentSkill.list'
  | 'helpdesk.v1.agentSkill.patch'
  | 'helpdesk.v1.agent.agentEmail'
  | 'helpdesk.v1.agent.patch'
  | 'helpdesk.v1.agentSchedules.delete'
  | 'helpdesk.v1.agentSchedules.get'
  | 'helpdesk.v1.agentSchedules.patch'
  | 'helpdesk.v1.botMessage.create'
  | 'helpdesk.v1.category.create'
  | 'helpdesk.v1.category.delete'
  | 'helpdesk.v1.category.get'
  | 'helpdesk.v1.category.list'
  | 'helpdesk.v1.category.patch'
  | 'helpdesk.v1.event.subscribe'
  | 'helpdesk.v1.event.unsubscribe'
  | 'helpdesk.v1.faq.create'
  | 'helpdesk.v1.faq.delete'
  | 'helpdesk.v1.faq.get'
  | 'helpdesk.v1.faq.list'
  | 'helpdesk.v1.faq.patch'
  | 'helpdesk.v1.faq.search'
  | 'helpdesk.v1.notification.cancelApprove'
  | 'helpdesk.v1.notification.cancelSend'
  | 'helpdesk.v1.notification.create'
  | 'helpdesk.v1.notification.executeSend'
  | 'helpdesk.v1.notification.get'
  | 'helpdesk.v1.notification.patch'
  | 'helpdesk.v1.notification.preview'
  | 'helpdesk.v1.notification.submitApprove'
  | 'helpdesk.v1.ticketCustomizedField.create'
  | 'helpdesk.v1.ticketCustomizedField.delete'
  | 'helpdesk.v1.ticketCustomizedField.get'
  | 'helpdesk.v1.ticketCustomizedField.list'
  | 'helpdesk.v1.ticketCustomizedField.patch'
  | 'helpdesk.v1.ticket.answerUserQuery'
  | 'helpdesk.v1.ticket.customizedFields'
  | 'helpdesk.v1.ticket.get'
  | 'helpdesk.v1.ticket.list'
  | 'helpdesk.v1.ticketMessage.create'
  | 'helpdesk.v1.ticketMessage.list'
  | 'helpdesk.v1.ticket.startService'
  | 'helpdesk.v1.ticket.update';
export const helpdeskV1AgentScheduleCreate = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agentSchedule.create',
  sdkName: 'helpdesk.v1.agentSchedule.create',
  path: '/open-apis/helpdesk/v1/agent_schedules',
  httpMethod: 'POST',
  description: '[Feishu/Lark]-Help Desk-Agent-Agent schedule-Create an agent-This API is used to create an agent',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      agent_schedules: z
        .array(
          z.object({
            agent_id: z
              .string()
              .describe(
                'Agent ID[Initiate a ticket at Help Desk as a user, and obtain the guest.id from the ticket details]',
              )
              .optional(),
            schedule: z
              .array(
                z.object({
                  start_time: z.string().describe('Start time, format 00:00 – 23:59').optional(),
                  end_time: z.string().describe('End time, format 00:00 – 23:59').optional(),
                  weekday: z
                    .number()
                    .describe(
                      'Day of the week, 1 - Monday, 2 - Tuesday, 3 - Wednesday, 4 - Thursday, 5 - Friday, 6 - Saturday, 7 - Sunday, 9 - Everyday, 10 - Weekday, 11 - Weekend',
                    )
                    .optional(),
                }),
              )
              .describe('Work schedule list')
              .optional(),
            agent_skill_ids: z.array(z.string()).describe('Skill IDs').optional(),
          }),
        )
        .describe('New agent schedule')
        .optional(),
    }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1AgentScheduleList = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agentSchedule.list',
  sdkName: 'helpdesk.v1.agentSchedule.list',
  path: '/open-apis/helpdesk/v1/agent_schedules',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-Agent-Agent schedule-List agent schedule-This API is used to obtain all agent information',
  accessTokens: ['tenant'],
  schema: {
    params: z.object({
      status: z
        .array(z.number())
        .describe(
          'Filter condition- 1: online agent- 2: offline (manual) agent- 3: off duty agent- 4: removed agentThe format for passing multiple values in a GET request is `status=1&status=2`',
        ),
    }),
  },
};
export const helpdeskV1AgentSkillRuleList = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agentSkillRule.list',
  sdkName: 'helpdesk.v1.agentSkillRule.list',
  path: '/open-apis/helpdesk/v1/agent_skill_rules',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-Agent-Agent skill rule-Obtain the skill list-This API is used to obtain all skills. Only available for custom apps',
  accessTokens: ['tenant'],
  schema: {},
};
export const helpdeskV1AgentSkillCreate = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agentSkill.create',
  sdkName: 'helpdesk.v1.agentSkill.create',
  path: '/open-apis/helpdesk/v1/agent_skills',
  httpMethod: 'POST',
  description: '[Feishu/Lark]-Help Desk-Agent-Agent skill-Create skills-This API is used to create agent skills',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      name: z.string().describe('Skill name').optional(),
      rules: z
        .array(
          z.object({
            id: z
              .string()
              .describe(
                'Rule ID. See [Obtain skill rules] for how to obtain the rules options',
              )
              .optional(),
            selected_operator: z
              .number()
              .describe(
                'Operator compare. See [Skill operator options]',
              )
              .optional(),
            operand: z.string().describe('Rule operand value').optional(),
            category: z
              .number()
              .describe("Rule type, 1 - FAQs, 2 - Ticket information, 3 - User's Feishu information")
              .optional(),
          }),
        )
        .describe('Skill rules')
        .optional(),
      agent_ids: z.array(z.string()).describe('Agent IDs').optional(),
    }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1AgentSkillDelete = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agentSkill.delete',
  sdkName: 'helpdesk.v1.agentSkill.delete',
  path: '/open-apis/helpdesk/v1/agent_skills/:agent_skill_id',
  httpMethod: 'DELETE',
  description: '[Feishu/Lark]-Help Desk-Agent-Agent skill-Delete agent skills-This API is used to delete agent skills',
  accessTokens: ['user'],
  schema: {
    path: z.object({ agent_skill_id: z.string().describe('agent group id').optional() }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1AgentSkillGet = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agentSkill.get',
  sdkName: 'helpdesk.v1.agentSkill.get',
  path: '/open-apis/helpdesk/v1/agent_skills/:agent_skill_id',
  httpMethod: 'GET',
  description: '[Feishu/Lark]-Help Desk-Agent-Agent skill-Obtain skills-This API is used to obtain skills',
  accessTokens: ['tenant'],
  schema: {
    path: z.object({ agent_skill_id: z.string().describe('agent skill id').optional() }),
  },
};
export const helpdeskV1AgentSkillList = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agentSkill.list',
  sdkName: 'helpdesk.v1.agentSkill.list',
  path: '/open-apis/helpdesk/v1/agent_skills',
  httpMethod: 'GET',
  description: '[Feishu/Lark]-Help Desk-Agent-Agent skill-Obtain all skills-Obtain all skills',
  accessTokens: ['tenant'],
  schema: {},
};
export const helpdeskV1AgentSkillPatch = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agentSkill.patch',
  sdkName: 'helpdesk.v1.agentSkill.patch',
  path: '/open-apis/helpdesk/v1/agent_skills/:agent_skill_id',
  httpMethod: 'PATCH',
  description: '[Feishu/Lark]-Help Desk-Agent-Agent skill-Update agent skills-This API is used to update agent skills',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      agent_skill: z
        .object({
          name: z.string().describe('Skill name').optional(),
          rules: z
            .array(
              z.object({
                id: z
                  .string()
                  .describe(
                    'Rule ID. See [Obtain skill rules] for how to obtain the rules options',
                  )
                  .optional(),
                selected_operator: z
                  .number()
                  .describe(
                    'Operator compare. See [Skill operator options]',
                  )
                  .optional(),
                operator_options: z
                  .array(z.number())
                  .describe(
                    'Rule operand value. See [Skills and operators]',
                  )
                  .optional(),
                operand: z.string().describe('Rule operand value').optional(),
              }),
            )
            .describe('Skill rules')
            .optional(),
          agent_ids: z.array(z.string()).describe('Agent IDs with this skill').optional(),
        })
        .describe('Update skills')
        .optional(),
    }),
    path: z.object({ agent_skill_id: z.string().describe('agent skill id') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1AgentAgentEmail = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agent.agentEmail',
  sdkName: 'helpdesk.v1.agent.agentEmail',
  path: '/open-apis/helpdesk/v1/agent_emails',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-Agent-Agent management-Obtain the agent email address-This API is used to obtain the agent email address',
  accessTokens: ['tenant'],
  schema: {},
};
export const helpdeskV1AgentPatch = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agent.patch',
  sdkName: 'helpdesk.v1.agent.patch',
  path: '/open-apis/helpdesk/v1/agents/:agent_id',
  httpMethod: 'PATCH',
  description:
    '[Feishu/Lark]-Help Desk-Agent-Agent management-Update agent information-Update information such as the agent status',
  accessTokens: ['user'],
  schema: {
    data: z.object({ status: z.number().describe('agent status, 1: Online; 2: Offline').optional() }),
    path: z.object({ agent_id: z.string().describe('Agent ID') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1AgentSchedulesDelete = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agentSchedules.delete',
  sdkName: 'helpdesk.v1.agentSchedules.delete',
  path: '/open-apis/helpdesk/v1/agents/:agent_id/schedules',
  httpMethod: 'DELETE',
  description: '[Feishu/Lark]-Help Desk-Agent-Agent schedule-Delete an agent-This API is used to delete the agent',
  accessTokens: ['user'],
  schema: {
    path: z.object({ agent_id: z.string().describe('agent user id').optional() }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1AgentSchedulesGet = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agentSchedules.get',
  sdkName: 'helpdesk.v1.agentSchedules.get',
  path: '/open-apis/helpdesk/v1/agents/:agent_id/schedules',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-Agent-Agent schedule-Obtain work schedules of agents-This API is used to obtain agent information',
  accessTokens: ['tenant'],
  schema: {
    path: z.object({ agent_id: z.string().describe('Agent ID') }),
  },
};
export const helpdeskV1AgentSchedulesPatch = {
  project: 'helpdesk',
  name: 'helpdesk.v1.agentSchedules.patch',
  sdkName: 'helpdesk.v1.agentSchedules.patch',
  path: '/open-apis/helpdesk/v1/agents/:agent_id/schedules',
  httpMethod: 'PATCH',
  description:
    '[Feishu/Lark]-Help Desk-Agent-Agent schedule-Update the agent schedule-This API is used to update the agent schedule',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      agent_schedule: z
        .object({
          schedule: z
            .array(
              z.object({
                start_time: z.string().describe('Start time, format 00:00 – 23:59').optional(),
                end_time: z.string().describe('End time, format 00:00 – 23:59').optional(),
                weekday: z
                  .number()
                  .describe(
                    'Day of the week, 1 - Monday, 2 - Tuesday, 3 - Wednesday, 4 - Thursday, 5 - Friday, 6 - Saturday, 7 - Sunday, 9 - Everyday, 10 - Weekday, 11 - Weekend',
                  )
                  .optional(),
              }),
            )
            .describe('Work schedule list')
            .optional(),
          agent_skill_ids: z.array(z.string()).describe('Skill IDs').optional(),
        })
        .describe('Work schedule list')
        .optional(),
    }),
    path: z.object({ agent_id: z.string().describe('Agent ID') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1BotMessageCreate = {
  project: 'helpdesk',
  name: 'helpdesk.v1.botMessage.create',
  sdkName: 'helpdesk.v1.botMessage.create',
  path: '/open-apis/helpdesk/v1/message',
  httpMethod: 'POST',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket message-Help Desk bots send messages-Use the Help Desk bot to send a message to a Help Desk dedicated group or private chat of a specified user, such as text, rich text, cards, and images',
  accessTokens: ['tenant'],
  schema: {
    data: z.object({
      msg_type: z
        .enum(['text', 'post', 'image', 'interactive'])
        .describe('Message type Options:text(Plain text),post(Rich text),image(Image),interactive(Card message)'),
      content: z
        .string()
        .describe(
          'Message content, JSON structure serialized to string. For format description, refer to [Send message content]',
        ),
      receiver_id: z.string().describe('User ID of the message recipient'),
      receive_type: z
        .enum(['chat', 'user'])
        .describe(
          'Message receiving type, chat (Help Desk dedicated service group) or user (Help Desk bot private chat). If a dedicated service group is selected, a ticket that is being processed by the user will fail to be sent. It is sent as chat by default. Options:chat(Send via Help Desk dedicated group),user(Send to a private chat using the Help Desk bot)',
        )
        .optional(),
    }),
    params: z.object({ user_id_type: z.enum(['open_id', 'union_id', 'user_id']).describe('User ID type').optional() }),
  },
};
export const helpdeskV1CategoryCreate = {
  project: 'helpdesk',
  name: 'helpdesk.v1.category.create',
  sdkName: 'helpdesk.v1.category.create',
  path: '/open-apis/helpdesk/v1/categories',
  httpMethod: 'POST',
  description: '[Feishu/Lark]-Help Desk-FAQ-Category-Create FAQs categories-This API is used to create FAQs categories',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      name: z.string().describe('Name'),
      parent_id: z.string().describe('Parent FAQs category ID'),
      language: z.string().describe('Language').optional(),
    }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1CategoryDelete = {
  project: 'helpdesk',
  name: 'helpdesk.v1.category.delete',
  sdkName: 'helpdesk.v1.category.delete',
  path: '/open-apis/helpdesk/v1/categories/:id',
  httpMethod: 'DELETE',
  description:
    '[Feishu/Lark]-Help Desk-FAQ-Category-Delete FAQs category details-This API is used to delete FAQs category details',
  accessTokens: ['user'],
  schema: {
    path: z.object({ id: z.string().describe('FAQs category ID') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1CategoryGet = {
  project: 'helpdesk',
  name: 'helpdesk.v1.category.get',
  sdkName: 'helpdesk.v1.category.get',
  path: '/open-apis/helpdesk/v1/categories/:id',
  httpMethod: 'GET',
  description: '[Feishu/Lark]-Help Desk-FAQ-Category-Obtain FAQs categories-This API is used to obtain FAQs categories',
  accessTokens: ['tenant'],
  schema: {
    path: z.object({ id: z.string().describe('FAQs category ID') }),
  },
};
export const helpdeskV1CategoryList = {
  project: 'helpdesk',
  name: 'helpdesk.v1.category.list',
  sdkName: 'helpdesk.v1.category.list',
  path: '/open-apis/helpdesk/v1/categories',
  httpMethod: 'GET',
  description: '[Feishu/Lark]-Help Desk-FAQ-Category-Obtain all FAQs categories-list all categories',
  accessTokens: ['tenant'],
  schema: {
    params: z.object({
      lang: z.string().describe('Knowledge base classification language').optional(),
      order_by: z
        .number()
        .describe('Sort key. 1: Sort according to the knowledge base classification update time')
        .optional(),
      asc: z.boolean().describe('Sequence. true: positive order; false: inverse order').optional(),
    }),
  },
};
export const helpdeskV1CategoryPatch = {
  project: 'helpdesk',
  name: 'helpdesk.v1.category.patch',
  sdkName: 'helpdesk.v1.category.patch',
  path: '/open-apis/helpdesk/v1/categories/:id',
  httpMethod: 'PATCH',
  description:
    '[Feishu/Lark]-Help Desk-FAQ-Category-Update FAQs category details-This API is used to update FAQs category details',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      name: z.string().describe('Name').optional(),
      parent_id: z.string().describe('Parent FAQs category ID').optional(),
    }),
    path: z.object({ id: z.string().describe('category id') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1EventSubscribe = {
  project: 'helpdesk',
  name: 'helpdesk.v1.event.subscribe',
  sdkName: 'helpdesk.v1.event.subscribe',
  path: '/open-apis/helpdesk/v1/events/subscribe',
  httpMethod: 'POST',
  description: '[Feishu/Lark]-Help Desk-Event-Subscribe to Help Desk events-Used for subscribing to Help Desk events',
  accessTokens: ['tenant'],
  schema: {
    data: z.object({
      events: z
        .array(z.object({ type: z.string().describe('Event type'), subtype: z.string().describe('Event subtype') }))
        .describe('List of subscribable events'),
    }),
  },
};
export const helpdeskV1EventUnsubscribe = {
  project: 'helpdesk',
  name: 'helpdesk.v1.event.unsubscribe',
  sdkName: 'helpdesk.v1.event.unsubscribe',
  path: '/open-apis/helpdesk/v1/events/unsubscribe',
  httpMethod: 'POST',
  description: '[Feishu/Lark]-Help Desk-Event-Unsubscribe Help Desk events-Used for unsubscribing Help Desk events',
  accessTokens: ['tenant'],
  schema: {
    data: z.object({
      events: z
        .array(z.object({ type: z.string().describe('Event type'), subtype: z.string().describe('Event subtype') }))
        .describe('event list to unsubscribe'),
    }),
  },
};
export const helpdeskV1FaqCreate = {
  project: 'helpdesk',
  name: 'helpdesk.v1.faq.create',
  sdkName: 'helpdesk.v1.faq.create',
  path: '/open-apis/helpdesk/v1/faqs',
  httpMethod: 'POST',
  description: '[Feishu/Lark]-Help Desk-FAQ-F\bAQ management-Create FAQs-This API is used to create FAQs',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      faq: z
        .object({
          category_id: z.string().describe('FAQs category ID').optional(),
          question: z.string().describe('Question'),
          answer: z.string().describe('Answer').optional(),
          answer_richtext: z
            .string()
            .describe(
              'Either the rich text answer or the answer is required, in the Json array format. For the rich text structure, see [Learn more about rich text]',
            )
            .optional(),
          tags: z.array(z.string()).describe('Similar question').optional(),
        })
        .describe('FAQs details')
        .optional(),
    }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1FaqDelete = {
  project: 'helpdesk',
  name: 'helpdesk.v1.faq.delete',
  sdkName: 'helpdesk.v1.faq.delete',
  path: '/open-apis/helpdesk/v1/faqs/:id',
  httpMethod: 'DELETE',
  description: '[Feishu/Lark]-Help Desk-FAQ-F\bAQ management-Delete FAQs-This API is used to delete FAQs',
  accessTokens: ['user'],
  schema: {
    path: z.object({ id: z.string().describe('id').optional() }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1FaqGet = {
  project: 'helpdesk',
  name: 'helpdesk.v1.faq.get',
  sdkName: 'helpdesk.v1.faq.get',
  path: '/open-apis/helpdesk/v1/faqs/:id',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-FAQ-F\bAQ management-Obtain FAQs details-This API is used to obtain FAQs details of Help Desk',
  accessTokens: ['tenant'],
  schema: {
    path: z.object({ id: z.string().describe('FAQs ID').optional() }),
  },
};
export const helpdeskV1FaqList = {
  project: 'helpdesk',
  name: 'helpdesk.v1.faq.list',
  sdkName: 'helpdesk.v1.faq.list',
  path: '/open-apis/helpdesk/v1/faqs',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-FAQ-F\bAQ management-Obtain all FAQs details-This API is used to obtain FAQs details of Help Desk',
  accessTokens: ['tenant'],
  schema: {
    params: z.object({
      category_id: z.string().describe('Knowledge Base Classification ID').optional(),
      status: z
        .string()
        .describe('Search criteria: Knowledge Base Status 1: Online 0: Deleted, Recoverable 2: Deleted, Unrecoverable')
        .optional(),
      search: z
        .string()
        .describe('Search criteria: keywords, matching question title, question keywords, user name')
        .optional(),
      page_token: z
        .string()
        .describe(
          'Page identifier. It is not filled in the first request, indicating traversal from the beginning; when there will be more groups, the new page_token will be returned at the same time, and the next traversal can use the page_token to get more groups',
        )
        .optional(),
      page_size: z.number().optional(),
    }),
  },
};
export const helpdeskV1FaqPatch = {
  project: 'helpdesk',
  name: 'helpdesk.v1.faq.patch',
  sdkName: 'helpdesk.v1.faq.patch',
  path: '/open-apis/helpdesk/v1/faqs/:id',
  httpMethod: 'PATCH',
  description: '[Feishu/Lark]-Help Desk-FAQ-F\bAQ management-Modify FAQs-This API is used to modify FAQs',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      faq: z
        .object({
          category_id: z.string().describe('FAQs category ID').optional(),
          question: z.string().describe('Question'),
          answer: z.string().describe('Answer').optional(),
          answer_richtext: z
            .array(
              z.object({
                content: z.string().describe('Content').optional(),
                type: z.string().describe('Type. Optional values: text, hyperlink, img, line break').optional(),
              }),
            )
            .describe(
              'Either the rich text answer or the answer is required, in the Json array format. For the rich text structure, see [Learn more about rich text]',
            )
            .optional(),
          tags: z.array(z.string()).describe('Similar question').optional(),
        })
        .describe('Modified FAQs content')
        .optional(),
    }),
    path: z.object({ id: z.string().describe('FAQs ID').optional() }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1FaqSearch = {
  project: 'helpdesk',
  name: 'helpdesk.v1.faq.search',
  sdkName: 'helpdesk.v1.faq.search',
  path: '/open-apis/helpdesk/v1/faqs/search',
  httpMethod: 'GET',
  description: '[Feishu/Lark]-Help Desk-FAQ-F\bAQ management-Search FAQs-This API is used to search Help Desk FAQs',
  accessTokens: ['tenant'],
  schema: {
    params: z.object({
      query: z
        .string()
        .describe(
          'Search query.If the query content is not in English, there are two encoding strategies: 1. URL encoding, 2. base64 encoding with base64=true parameters',
        ),
      base64: z
        .string()
        .describe(
          'Whether to convert it to base64. Enter true for Yes. Leaving it blank indicates No. Chinese needs to be converted to base64',
        )
        .optional(),
      page_token: z
        .string()
        .describe(
          'Page identifier. It is not filled in the first request, indicating traversal from the beginning; when there will be more groups, the new page_token will be returned at the same time, and the next traversal can use the page_token to get more groups',
        )
        .optional(),
      page_size: z.number().optional(),
    }),
  },
};
export const helpdeskV1NotificationCancelApprove = {
  project: 'helpdesk',
  name: 'helpdesk.v1.notification.cancelApprove',
  sdkName: 'helpdesk.v1.notification.cancelApprove',
  path: '/open-apis/helpdesk/v1/notifications/:notification_id/cancel_approve',
  httpMethod: 'POST',
  description:
    '[Feishu/Lark]-Help Desk-Notification-Cancel approval-Call this API to cancel the review after submission',
  accessTokens: ['user'],
  schema: {
    path: z.object({ notification_id: z.string().describe('Unique ID') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1NotificationCancelSend = {
  project: 'helpdesk',
  name: 'helpdesk.v1.notification.cancelSend',
  sdkName: 'helpdesk.v1.notification.cancelSend',
  path: '/open-apis/helpdesk/v1/notifications/:notification_id/cancel_send',
  httpMethod: 'POST',
  description:
    '[Feishu/Lark]-Help Desk-Notification-Cancel notification-Cancel push API. This API can be called when waiting for the scheduled sending after approval, during message sending (the message sent will be recalled), and after sending (all the messages sent will be recalled)',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      is_recall: z
        .boolean()
        .describe('Whether to recall the sent message, also applicable to the message for new staff'),
    }),
    path: z.object({ notification_id: z.string().describe('Unique ID') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1NotificationCreate = {
  project: 'helpdesk',
  name: 'helpdesk.v1.notification.create',
  sdkName: 'helpdesk.v1.notification.create',
  path: '/open-apis/helpdesk/v1/notifications',
  httpMethod: 'POST',
  description:
    '[Feishu/Lark]-Help Desk-Notification-Create notification-The API is called to create a push, which is in draft status after being created',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      id: z.string().describe('Optional, returned upon successful creation').optional(),
      job_name: z.string().describe('Required, task name').optional(),
      status: z.number().describe('Optional, returned upon successful creation').optional(),
      create_user: z
        .object({
          user_id: z.string().describe('Optional, user ID').optional(),
          avatar_url: z.string().describe('Optional, profile photo address').optional(),
          name: z.string().describe('Optional, user name').optional(),
        })
        .describe('Optional, creator')
        .optional(),
      created_at: z.string().describe('Optional, creation time (timestamp in ms)').optional(),
      update_user: z
        .object({
          user_id: z.string().describe('Optional, user ID').optional(),
          avatar_url: z.string().describe('Optional, profile photo address').optional(),
          name: z.string().describe('Optional, user name').optional(),
        })
        .describe('Optional, updated by')
        .optional(),
      updated_at: z.string().describe('Optional, last update (timestamp in ms)').optional(),
      target_user_count: z.number().describe('Optional, total number of target users pushed').optional(),
      sent_user_count: z.number().describe('Optional, total number of users pushed').optional(),
      read_user_count: z.number().describe('Optional, total number of users who have read').optional(),
      send_at: z.string().describe('Optional, push task trigger time (timestamp in ms)').optional(),
      push_content: z
        .string()
        .describe(
          'Required, push content. For details, visit https://open.feishu.cn/tool/cardbuilder?fromhelpdesk.v1.type.notification.prop.read_user_count.desc=$$$Optional, total number of users who have read',
        )
        .optional(),
      push_type: z
        .number()
        .describe(
          'Required,0 (Timed push: push_scope cannot be equal to 3), 1 (New staff onboarding push: push_scope must be equal to 1 or 3; new_staff_scope_type cannot be empty)',
        )
        .optional(),
      push_scope_type: z
        .number()
        .describe(
          'Required,push scope (Help Desk private message) 0: All members in the organization (user_list and department_list must be empty), 1: None of the members (user_list and department_list must be empty, and chat_list cannot be empty), 2: Specified members (user_list or department_list cannot be empty), 3: New staff. chat_list for these four scopes are relatively independent, and is only required when the push scope is 1.',
        )
        .optional(),
      new_staff_scope_type: z
        .number()
        .describe(
          'Optional,new staff enrollment scope type (effective when push_type is 1) 0: All new staff in the organization, 1: Specific department in the organization (new_staff_scope_department_list field cannot be empty)',
        )
        .optional(),
      new_staff_scope_department_list: z
        .array(
          z.object({
            department_id: z.string().describe('Department ID').optional(),
            name: z.string().describe('Optional, department name').optional(),
          }),
        )
        .describe('Optional, list of effective departments with onboarded employees')
        .optional(),
      user_list: z
        .array(
          z.object({
            user_id: z.string().describe('Optional, user ID').optional(),
            avatar_url: z.string().describe('Optional, profile photo address').optional(),
            name: z.string().describe('Optional, user name').optional(),
          }),
        )
        .describe('Optional, list of members to whom the message is pushed')
        .optional(),
      department_list: z
        .array(
          z.object({
            department_id: z.string().describe('Department ID').optional(),
            name: z.string().describe('Optional, department name').optional(),
          }),
        )
        .describe('Optional, list of departments to which the message is pushed')
        .optional(),
      chat_list: z
        .array(
          z.object({
            chat_id: z.string().describe('Optional, chat ID').optional(),
            name: z.string().describe('Optional, chat name').optional(),
          }),
        )
        .describe('Optional, list of group chats to which the message is pushed')
        .optional(),
      ext: z.string().describe('Optional, extended field reserved').optional(),
    }),
    params: z.object({ user_id_type: z.enum(['open_id', 'union_id', 'user_id']).describe('User ID type').optional() }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1NotificationExecuteSend = {
  project: 'helpdesk',
  name: 'helpdesk.v1.notification.executeSend',
  sdkName: 'helpdesk.v1.notification.executeSend',
  path: '/open-apis/helpdesk/v1/notifications/:notification_id/execute_send',
  httpMethod: 'POST',
  description:
    '[Feishu/Lark]-Help Desk-Notification-Push message-After approval, call this API to set the push time, and wait for the scheduling system to send the message',
  accessTokens: ['user'],
  schema: {
    data: z.object({ send_at: z.string().describe('Send the timestamp (in ms)') }),
    path: z.object({ notification_id: z.string().describe('The unique ID returned by the "Create push" API') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1NotificationGet = {
  project: 'helpdesk',
  name: 'helpdesk.v1.notification.get',
  sdkName: 'helpdesk.v1.notification.get',
  path: '/open-apis/helpdesk/v1/notifications/:notification_id',
  httpMethod: 'GET',
  description: '[Feishu/Lark]-Help Desk-Notification-Query notification-Query push details',
  accessTokens: ['user'],
  schema: {
    params: z.object({ user_id_type: z.enum(['open_id', 'union_id', 'user_id']).describe('User ID type').optional() }),
    path: z.object({ notification_id: z.string().describe('Unique ID') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1NotificationPatch = {
  project: 'helpdesk',
  name: 'helpdesk.v1.notification.patch',
  sdkName: 'helpdesk.v1.notification.patch',
  path: '/open-apis/helpdesk/v1/notifications/:notification_id',
  httpMethod: 'PATCH',
  description:
    '[Feishu/Lark]-Help Desk-Notification-Update notification-Update push message. This API can only be called when the message is in draft status',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      id: z.string().describe('Optional, returned upon successful creation').optional(),
      job_name: z.string().describe('Required, task name').optional(),
      status: z.number().describe('Optional, returned upon successful creation').optional(),
      create_user: z
        .object({
          user_id: z.string().describe('Optional, user ID').optional(),
          avatar_url: z.string().describe('Optional, profile photo address').optional(),
          name: z.string().describe('Optional, user name').optional(),
        })
        .describe('Optional, creator')
        .optional(),
      created_at: z.string().describe('Optional, creation time (timestamp in ms)').optional(),
      update_user: z
        .object({
          user_id: z.string().describe('Optional, user ID').optional(),
          avatar_url: z.string().describe('Optional, profile photo address').optional(),
          name: z.string().describe('Optional, user name').optional(),
        })
        .describe('Optional, updated by')
        .optional(),
      updated_at: z.string().describe('Optional, last update (timestamp in ms)').optional(),
      target_user_count: z.number().describe('Optional, total number of target users pushed').optional(),
      sent_user_count: z.number().describe('Optional, total number of users pushed').optional(),
      read_user_count: z.number().describe('Optional, total number of users who have read').optional(),
      send_at: z.string().describe('Optional, push task trigger time (timestamp in ms)').optional(),
      push_content: z
        .string()
        .describe(
          'Required, push content. For details, visit https://open.feishu.cn/tool/cardbuilder?fromhelpdesk.v1.type.notification.prop.read_user_count.desc=$$$Optional, total number of users who have read',
        )
        .optional(),
      push_type: z
        .number()
        .describe(
          'Required,0 (Timed push: push_scope cannot be equal to 3), 1 (New staff onboarding push: push_scope must be equal to 1 or 3; new_staff_scope_type cannot be empty)',
        )
        .optional(),
      push_scope_type: z
        .number()
        .describe(
          'Required,push scope (Help Desk private message) 0: All members in the organization (user_list and department_list must be empty), 1: None of the members (user_list and department_list must be empty, and chat_list cannot be empty), 2: Specified members (user_list or department_list cannot be empty), 3: New staff. chat_list for these four scopes are relatively independent, and is only required when the push scope is 1.',
        )
        .optional(),
      new_staff_scope_type: z
        .number()
        .describe(
          'Optional,new staff enrollment scope type (effective when push_type is 1) 0: All new staff in the organization, 1: Specific department in the organization (new_staff_scope_department_list field cannot be empty)',
        )
        .optional(),
      new_staff_scope_department_list: z
        .array(
          z.object({
            department_id: z.string().describe('Department ID').optional(),
            name: z.string().describe('Optional, department name').optional(),
          }),
        )
        .describe('Optional, list of effective departments with onboarded employees')
        .optional(),
      user_list: z
        .array(
          z.object({
            user_id: z.string().describe('Optional, user ID').optional(),
            avatar_url: z.string().describe('Optional, profile photo address').optional(),
            name: z.string().describe('Optional, user name').optional(),
          }),
        )
        .describe('Optional, list of members to whom the message is pushed')
        .optional(),
      department_list: z
        .array(
          z.object({
            department_id: z.string().describe('Department ID').optional(),
            name: z.string().describe('Optional, department name').optional(),
          }),
        )
        .describe('Optional, list of departments to which the message is pushed')
        .optional(),
      chat_list: z
        .array(
          z.object({
            chat_id: z.string().describe('Optional, chat ID').optional(),
            name: z.string().describe('Optional, chat name').optional(),
          }),
        )
        .describe('Optional, list of group chats to which the message is pushed')
        .optional(),
      ext: z.string().describe('Optional, extended field reserved').optional(),
    }),
    params: z.object({ user_id_type: z.enum(['open_id', 'union_id', 'user_id']).describe('User ID type').optional() }),
    path: z.object({ notification_id: z.string().describe('Push task unique ID') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1NotificationPreview = {
  project: 'helpdesk',
  name: 'helpdesk.v1.notification.preview',
  sdkName: 'helpdesk.v1.notification.preview',
  path: '/open-apis/helpdesk/v1/notifications/:notification_id/preview',
  httpMethod: 'POST',
  description:
    '[Feishu/Lark]-Help Desk-Notification-Preview notification-This API can be called to preview the set push content before the push',
  accessTokens: ['user'],
  schema: {
    path: z.object({
      notification_id: z.string().describe('Unique ID returned after successful creation of the push API'),
    }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1NotificationSubmitApprove = {
  project: 'helpdesk',
  name: 'helpdesk.v1.notification.submitApprove',
  sdkName: 'helpdesk.v1.notification.submitApprove',
  path: '/open-apis/helpdesk/v1/notifications/:notification_id/submit_approve',
  httpMethod: 'POST',
  description:
    '[Feishu/Lark]-Help Desk-Notification-Submit approval-Normally, the "Submit for review" API can be called after the "Create push" API is called. If the creator is the Help Desk owner, the push message will be automatically approved; otherwise, the Help Desk owner will be notified to review the push message',
  accessTokens: ['user'],
  schema: {
    data: z.object({ reason: z.string().describe('Submit reasons for approval') }),
    path: z.object({ notification_id: z.string().describe('The unique ID returned by the "Create push" API') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1TicketCustomizedFieldCreate = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticketCustomizedField.create',
  sdkName: 'helpdesk.v1.ticketCustomizedField.create',
  path: '/open-apis/helpdesk/v1/ticket_customized_fields',
  httpMethod: 'POST',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket customized field-Create custom ticket fields-create ticket customized field',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      helpdesk_id: z.string().optional(),
      key_name: z.string(),
      display_name: z.string(),
      position: z.string(),
      field_type: z.string(),
      description: z.string(),
      visible: z.boolean(),
      editable: z.boolean().optional(),
      required: z.boolean(),
      dropdown_allow_multiple: z.boolean().optional(),
    }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1TicketCustomizedFieldDelete = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticketCustomizedField.delete',
  sdkName: 'helpdesk.v1.ticketCustomizedField.delete',
  path: '/open-apis/helpdesk/v1/ticket_customized_fields/:ticket_customized_field_id',
  httpMethod: 'DELETE',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket customized field-Delete custom ticket fields-This API is used to delete custom ticket fields',
  accessTokens: ['user'],
  schema: {
    path: z.object({ ticket_customized_field_id: z.string().describe('Custom ticket field ID') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1TicketCustomizedFieldGet = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticketCustomizedField.get',
  sdkName: 'helpdesk.v1.ticketCustomizedField.get',
  path: '/open-apis/helpdesk/v1/ticket_customized_fields/:ticket_customized_field_id',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket customized field-Obtain custom ticket fields-get ticket customized field',
  accessTokens: ['tenant'],
  schema: {
    path: z.object({ ticket_customized_field_id: z.string().describe('Work order custom field ID') }),
  },
};
export const helpdeskV1TicketCustomizedFieldList = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticketCustomizedField.list',
  sdkName: 'helpdesk.v1.ticketCustomizedField.list',
  path: '/open-apis/helpdesk/v1/ticket_customized_fields',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket customized field-Obtain all custom fields of ticket-list the ticket customized fields',
  accessTokens: ['tenant'],
  schema: {
    data: z.object({ visible: z.boolean().describe('Is it visible').optional() }),
    params: z.object({ page_token: z.string().optional(), page_size: z.number().optional() }),
  },
};
export const helpdeskV1TicketCustomizedFieldPatch = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticketCustomizedField.patch',
  sdkName: 'helpdesk.v1.ticketCustomizedField.patch',
  path: '/open-apis/helpdesk/v1/ticket_customized_fields/:ticket_customized_field_id',
  httpMethod: 'PATCH',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket customized field-Update custom fields of ticket-update the ticket customized field',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      display_name: z.string().optional(),
      position: z.string().optional(),
      description: z.string().optional(),
      visible: z.boolean().optional(),
      required: z.boolean().optional(),
    }),
    path: z.object({ ticket_customized_field_id: z.string().describe('Work order custom field ID') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1TicketAnswerUserQuery = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticket.answerUserQuery',
  sdkName: 'helpdesk.v1.ticket.answerUserQuery',
  path: '/open-apis/helpdesk/v1/tickets/:ticket_id/answer_user_query',
  httpMethod: 'POST',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket management-Reply user query results to tickets-This API is used to reply user query results to tickets that are in progress and not handed off to any human agent. Only custom apps are supported',
  accessTokens: ['tenant'],
  schema: {
    data: z.object({
      event_id: z.string().describe('Event ID, which can be extracted from subscription events'),
      faqs: z
        .array(
          z.object({
            id: z.string().describe('FAQ ID').optional(),
            score: z.number().describe('FAQ score').optional(),
          }),
        )
        .describe('List of FAQs')
        .optional(),
    }),
    path: z.object({ ticket_id: z.string().describe('Ticket ID') }),
  },
};
export const helpdeskV1TicketCustomizedFields = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticket.customizedFields',
  sdkName: 'helpdesk.v1.ticket.customizedFields',
  path: '/open-apis/helpdesk/v1/customized_fields',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket management-List customized fields-This API is used to obtain Help Desk custom field details',
  accessTokens: ['tenant'],
  schema: {
    params: z.object({ visible_only: z.boolean().describe('visible only').optional() }),
  },
};
export const helpdeskV1TicketGet = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticket.get',
  sdkName: 'helpdesk.v1.ticket.get',
  path: '/open-apis/helpdesk/v1/tickets/:ticket_id',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket management-Obtain ticket details-This API is used to obtain details of a Help Desk ticket. Only custom apps are supported',
  accessTokens: ['tenant'],
  schema: {
    path: z.object({ ticket_id: z.string().describe('ticket id') }),
  },
};
export const helpdeskV1TicketList = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticket.list',
  sdkName: 'helpdesk.v1.ticket.list',
  path: '/open-apis/helpdesk/v1/tickets',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket management-Obtain all ticket details-This API is used to obtain details of all tickets. Only custom apps are supported',
  accessTokens: ['tenant'],
  schema: {
    params: z.object({
      ticket_id: z.string().describe('Search criterion: ticket ID').optional(),
      agent_id: z.string().describe('Search criterion: agent ID').optional(),
      closed_by_id: z.string().describe('Search criterion: ID of the agent closing the ticket').optional(),
      type: z.number().describe('Search criterion: ticket type. 1: bot; 2: agent').optional(),
      channel: z.number().describe('Search criterion: ticket channel').optional(),
      solved: z.number().describe('Search criterion: Ticket resolved. 1: not resolved, 2: resolved').optional(),
      score: z.number().describe('Search criterion: ticket score').optional(),
      status_list: z.array(z.number()).describe('Search criterion: ticket status list').optional(),
      guest_name: z.string().describe('Search criterion: user name').optional(),
      guest_id: z.string().describe('Search criterion: user ID').optional(),
      tags: z.array(z.string()).describe('Search criterion: user label list').optional(),
      page: z.number().describe('Number of pages, starting from 1, default is 1').optional(),
      page_size: z
        .number()
        .describe(
          'The current page size. The maximum value is 200. The default value is 20. A maximum of 10,000 data entries can be returned for paging query. If you want to query more than 10,000 entries, change the query criteria. It is recommended to query by time',
        )
        .optional(),
      create_time_start: z
        .number()
        .describe(
          'Search criterion: ticket creation start time, in ms (used with create_time_end), equivalent to >helpdesk.v1.type.ticket.prop.collaborators.desc=$$$Ticket collaborator',
        )
        .optional(),
      create_time_end: z
        .number()
        .describe(
          'Search criterion: ticket creation end time, in ms, (used with create_time_start), equivalent to <helpdesk.v1.type.ticket.prop.created_at.int.example=$$$1616920429000',
        )
        .optional(),
      update_time_start: z
        .number()
        .describe('Search criterion: ticket modification start time, in ms (used with update_time_end)')
        .optional(),
      update_time_end: z
        .number()
        .describe('Search criterion: ticket modification end time, in ms (used with update_time_start)')
        .optional(),
    }),
  },
};
export const helpdeskV1TicketMessageCreate = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticketMessage.create',
  sdkName: 'helpdesk.v1.ticketMessage.create',
  path: '/open-apis/helpdesk/v1/tickets/:ticket_id/messages',
  httpMethod: 'POST',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket message-Send ticket messages-This API is used to send ticket messages',
  accessTokens: ['tenant'],
  schema: {
    data: z.object({
      msg_type: z.string().describe('Message type. text: plain text; post: rich text'),
      content: z
        .string()
        .describe(
          '- Plain text, (see content in [Send text messages])- Rich text (see content in [Send rich text messages])',
        ),
    }),
    path: z.object({ ticket_id: z.string().describe('Ticket ID').optional() }),
  },
};
export const helpdeskV1TicketMessageList = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticketMessage.list',
  sdkName: 'helpdesk.v1.ticketMessage.list',
  path: '/open-apis/helpdesk/v1/tickets/:ticket_id/messages',
  httpMethod: 'GET',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket message-Get ticket message details-This API is used to obtain details of Help Desk ticket messages',
  accessTokens: ['tenant'],
  schema: {
    params: z.object({
      time_start: z.number().describe('Start time').optional(),
      time_end: z.number().describe('End time').optional(),
      page: z.number().describe('Page ID').optional(),
      page_size: z.number().describe('Number of messages. Max. value: 200. Default value: 20').optional(),
    }),
    path: z.object({ ticket_id: z.string().describe('Ticket ID').optional() }),
  },
};
export const helpdeskV1TicketStartService = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticket.startService',
  sdkName: 'helpdesk.v1.ticket.startService',
  path: '/open-apis/helpdesk/v1/start_service',
  httpMethod: 'POST',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket management-Create a Help Desk chat-This API is used to create a Help Desk chat',
  accessTokens: ['tenant'],
  schema: {
    data: z.object({
      human_service: z
        .boolean()
        .describe('Specifies whether to enter human agent service directly (required if appointed_agents is entered)')
        .optional(),
      appointed_agents: z
        .array(z.string())
        .describe(
          'Agent Open IDs (for how to obtain them, see [Obtain single user information]). human_service should be true',
        )
        .optional(),
      open_id: z
        .string()
        .describe(
          'User Open ID, (for how to obtain them, see [Obtain single user information].)',
        ),
      customized_info: z
        .string()
        .describe(
          'Custom information of the ticket source (at most 1,024 characters). If this field is set, the information will be returned when [Obtain ticket details] is called',
        )
        .optional(),
    }),
  },
};
export const helpdeskV1TicketUpdate = {
  project: 'helpdesk',
  name: 'helpdesk.v1.ticket.update',
  sdkName: 'helpdesk.v1.ticket.update',
  path: '/open-apis/helpdesk/v1/tickets/:ticket_id',
  httpMethod: 'PUT',
  description:
    '[Feishu/Lark]-Help Desk-Ticket-Ticket management-Update ticket details-This API is used to update Help Desk ticket details. This API only updates data and do not trigger actions. For example, changing the ticket status to "closed" by calling this API will not close the chat page. Only custom apps are supported. Ticket fields to be updated cannot be left empty',
  accessTokens: ['user'],
  schema: {
    data: z.object({
      status: z
        .number()
        .describe(
          'New status. 1: Created, 2: Processing, 3: In queue, 5: Pending, 50: Ticket closed by bot, 51: Ticket closed by agent or user',
        )
        .optional(),
      tag_names: z.array(z.string()).describe('New tag name').optional(),
      comment: z.string().describe('New comment').optional(),
      customized_fields: z
        .array(
          z.object({
            id: z.string().describe('Custom field ID').optional(),
            value: z.string().describe('Custom field value').optional(),
            key_name: z.string().describe('Key name').optional(),
          }),
        )
        .describe('Custom field')
        .optional(),
      ticket_type: z.number().describe('ticket stage').optional(),
      solved: z.number().describe('Specifies whether the ticket is resolved, 1: not resolved, 2: resolved').optional(),
      channel: z.number().describe('ID of the ticket source channel').optional(),
    }),
    path: z.object({ ticket_id: z.string().describe('Ticket ID') }),
    useUAT: z.boolean().describe('Use user access token, otherwise use tenant access token').optional(),
  },
};
export const helpdeskV1Tools = [
  helpdeskV1AgentScheduleCreate,
  helpdeskV1AgentScheduleList,
  helpdeskV1AgentSkillRuleList,
  helpdeskV1AgentSkillCreate,
  helpdeskV1AgentSkillDelete,
  helpdeskV1AgentSkillGet,
  helpdeskV1AgentSkillList,
  helpdeskV1AgentSkillPatch,
  helpdeskV1AgentAgentEmail,
  helpdeskV1AgentPatch,
  helpdeskV1AgentSchedulesDelete,
  helpdeskV1AgentSchedulesGet,
  helpdeskV1AgentSchedulesPatch,
  helpdeskV1BotMessageCreate,
  helpdeskV1CategoryCreate,
  helpdeskV1CategoryDelete,
  helpdeskV1CategoryGet,
  helpdeskV1CategoryList,
  helpdeskV1CategoryPatch,
  helpdeskV1EventSubscribe,
  helpdeskV1EventUnsubscribe,
  helpdeskV1FaqCreate,
  helpdeskV1FaqDelete,
  helpdeskV1FaqGet,
  helpdeskV1FaqList,
  helpdeskV1FaqPatch,
  helpdeskV1FaqSearch,
  helpdeskV1NotificationCancelApprove,
  helpdeskV1NotificationCancelSend,
  helpdeskV1NotificationCreate,
  helpdeskV1NotificationExecuteSend,
  helpdeskV1NotificationGet,
  helpdeskV1NotificationPatch,
  helpdeskV1NotificationPreview,
  helpdeskV1NotificationSubmitApprove,
  helpdeskV1TicketCustomizedFieldCreate,
  helpdeskV1TicketCustomizedFieldDelete,
  helpdeskV1TicketCustomizedFieldGet,
  helpdeskV1TicketCustomizedFieldList,
  helpdeskV1TicketCustomizedFieldPatch,
  helpdeskV1TicketAnswerUserQuery,
  helpdeskV1TicketCustomizedFields,
  helpdeskV1TicketGet,
  helpdeskV1TicketList,
  helpdeskV1TicketMessageCreate,
  helpdeskV1TicketMessageList,
  helpdeskV1TicketStartService,
  helpdeskV1TicketUpdate,
];
