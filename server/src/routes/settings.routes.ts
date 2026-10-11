import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';

const updateSettingSchema = z.object({
	theme: z.enum(['dark', 'light']).optional(),
	cardDensity: z.enum(['comfortable', 'compact']).optional(),
	showTips: z.boolean().optional(),
	language: z.enum(['en', 'ru', 'pl']).optional(),
	defaultTaskPriority: z.enum(['low', 'medium', 'high']).optional(),
	urgentThresholdHours: z.union([z.literal(24), z.literal(48), z.literal(72)]).optional(),
	completedTasksVisibility: z.enum(['tab_only', 'active_list']).optional()
});

const settingsSelect = {
	theme: true,
	cardDensity: true,
	language: true,
	showTips: true,
	defaultTaskPriority: true,
	urgentThresholdHours: true,
	completedTasksVisibility: true
} as const;

export async function settingsRoutes(app: FastifyInstance) {
	app.get(
		'/settings',
		{
			preHandler: authenticate
		},
		async (request) => {
			const settings = await prisma.userSettings.upsert({
				where: {
					userId: request.user.id
				},
				update: {},
				create: {
					userId: request.user.id
				},

				select: settingsSelect
			});

			return {
				settings
			};
		}
	);

	app.patch(
		'/settings',
		{
			preHandler: authenticate
		},
		async (request, reply) => {
			const body = updateSettingSchema.safeParse(request.body);

			if (!body.success) {
				return reply.status(400).send({
					message: 'Invalid request body'
				});
			}

			const updatedSettings = await prisma.userSettings.upsert({
				where: {
					userId: request.user.id
				},
				update: body.data,
				create: {
					userId: request.user.id,
					...body.data
				},
				select: settingsSelect
			});

			return {
				settings: updatedSettings
			};
		}
	);
}
