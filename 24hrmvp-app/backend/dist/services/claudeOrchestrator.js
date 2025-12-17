"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MVPOrchestrator = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const client_1 = require("../db/client");
const anthropic = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
class MVPOrchestrator {
    async buildMVP(ideaId, _progressCallback) {
        try {
            const idea = await client_1.prisma.idea.findUnique({
                where: { id: ideaId },
            });
            if (!idea) {
                throw new Error('Idea not found');
            }
            // Constitutional AI system prompt
            const systemPrompt = `You are an expert full-stack developer building MVPs rapidly.

Core Principles:
- Modern, Stable, Flexible architecture only
- Use production-ready dependencies
- Follow security best practices
- Create comprehensive documentation
- Write clean, maintainable code

You will receive an idea and provide step-by-step implementation commands.`;
            const userPrompt = `Build MVP: ${idea.title}

Description: ${idea.description}

Category: ${idea.category}
Complexity: ${idea.complexity}

Requirements:
- Use Node.js 22.11.0+
- TypeScript 5.x
- Modern stable frameworks
- Deploy-ready architecture

Provide a detailed implementation plan with commands.`;
            // Call Claude Sonnet 4.5
            const message = await anthropic.messages.create({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 8192,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: userPrompt,
                    },
                ],
            });
            // Extract text response
            const response = message.content
                .filter((block) => block.type === 'text')
                .map((block) => (block.type === 'text' ? block.text : ''))
                .join('\n');
            // Update MVP project with response
            await client_1.prisma.mVPProject.update({
                where: { ideaId },
                data: {
                    status: 'in_progress',
                    progress: 50,
                    logs: [
                        {
                            timestamp: new Date().toISOString(),
                            message: 'Claude generated implementation plan',
                            data: response,
                        },
                    ],
                },
            });
            return {
                success: true,
                response,
            };
        }
        catch (error) {
            console.error('MVP build error:', error);
            await client_1.prisma.mVPProject.update({
                where: { ideaId },
                data: {
                    status: 'failed',
                    logs: [
                        {
                            timestamp: new Date().toISOString(),
                            message: 'Build failed',
                            error: error instanceof Error ? error.message : 'Unknown error',
                        },
                    ],
                },
            });
            throw error;
        }
    }
}
exports.MVPOrchestrator = MVPOrchestrator;
exports.default = new MVPOrchestrator();
//# sourceMappingURL=claudeOrchestrator.js.map