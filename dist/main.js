#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./doubao-webapi/client");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    // Help menu
    if (args.includes('--help') || args.includes('-h') || args.length === 0) {
        console.log(`
Doubao Web API Image Generation

Usage:
  npx ts-node scripts/main.ts "Your prompt here" [options]

Modes:
  Text to Image (default):  Generate image from text prompt
  Image to Image:           Generate image based on a reference image (--ref-image)
  Image Fusion:             Blend multiple images together (--fuse-images)

Options:
  --ui                    Show browser window (required for first login)
  --quality=<value>       Image quality: 'preview' or 'original' (default: original)
  --ratio=<value>         Image ratio/resolution (e.g., '16:9', '1:1', '1024x1024')
  --output=<path>         Path to save the generated image (e.g., ./my_cat.png). 
                          If not specified, defaults to 'generated.png' in current directory.
  --image=<path>          Alias for --output
  
  # Image to Image options:
  --ref-image=<path>      Reference image path for image-to-image generation
  --ref-strength=<0-1>    How much to follow reference (default: 0.7)
  
  # Image Fusion options:
  --fuse-images=<paths>   Comma-separated paths of images to fuse (e.g., img1.png,img2.png)
  --fuse-mode=<mode>      Fusion style: 'blend', 'style', 'face' (default: blend)
  
  --help, -h              Show this help menu
        `);
        process.exit(0);
    }
    // 默认开启 headless 模式，除非用户显式指定了 --ui
    const uiFlag = args.includes('--ui');
    const headlessFlag = !uiFlag;
    // Check for quality flag (--quality=preview or --quality=original)
    let quality = 'original';
    const qualityArg = args.find(arg => arg.startsWith('--quality='));
    if (qualityArg) {
        const val = qualityArg.split('=')[1];
        if (val === 'preview' || val === 'original') {
            quality = val;
        }
    }
    // Check for ratio/resolution flag
    let ratio = undefined;
    const ratioArg = args.find(arg => arg.startsWith('--ratio='));
    if (ratioArg) {
        ratio = ratioArg.split('=')[1];
    }
    // Parse output path
    let outputPath = path.resolve(process.cwd(), 'generated.png');
    const outputArg = args.find(arg => arg.startsWith('--output=') || arg.startsWith('--image='));
    if (outputArg) {
        const val = outputArg.split('=')[1];
        if (val && val.trim().length > 0) {
            outputPath = path.resolve(process.cwd(), val.trim());
        }
    }
    else {
        // Also check if they used space format e.g. "--output ./file.png"
        const outIndex = args.findIndex(arg => arg === '--output' || arg === '--image');
        if (outIndex !== -1 && outIndex + 1 < args.length && !args[outIndex + 1].startsWith('-')) {
            outputPath = path.resolve(process.cwd(), args[outIndex + 1].trim());
        }
    }
    // Parse image-to-image options
    let refImagePath = undefined;
    const refImageArg = args.find(arg => arg.startsWith('--ref-image='));
    if (refImageArg) {
        refImagePath = path.resolve(process.cwd(), refImageArg.split('=')[1].trim());
    }
    let refStrength = 0.7;
    const refStrengthArg = args.find(arg => arg.startsWith('--ref-strength='));
    if (refStrengthArg) {
        refStrength = parseFloat(refStrengthArg.split('=')[1]) || 0.7;
    }
    // Parse image fusion options
    let fuseImagePaths = undefined;
    const fuseImagesArg = args.find(arg => arg.startsWith('--fuse-images='));
    if (fuseImagesArg) {
        fuseImagePaths = fuseImagesArg.split('=')[1].split(',').map(p => path.resolve(process.cwd(), p.trim()));
    }
    let fuseMode = 'blend';
    const fuseModeArg = args.find(arg => arg.startsWith('--fuse-mode='));
    if (fuseModeArg) {
        const mode = fuseModeArg.split('=')[1].trim();
        if (['blend', 'style', 'face'].includes(mode)) {
            fuseMode = mode;
        }
    }
    // Determine mode
    const mode = refImagePath ? 'img2img' : (fuseImagePaths ? 'fusion' : 'txt2img');
    // Validate input files exist
    if (refImagePath && !fs.existsSync(refImagePath)) {
        console.error(`❌ 参考图片不存在: ${refImagePath}`);
        process.exit(1);
    }
    if (fuseImagePaths) {
        for (const p of fuseImagePaths) {
            if (!fs.existsSync(p)) {
                console.error(`❌ 融合图片不存在: ${p}`);
                process.exit(1);
            }
        }
    }
    // Filter out options to get the prompt
    const promptParts = args.filter(arg => !arg.startsWith('-') && args[args.indexOf(arg) - 1] !== '--output' && args[args.indexOf(arg) - 1] !== '--image');
    const prompt = promptParts.join(' ').trim() || '一只可爱的金毛犬';
    let client = new client_1.DoubaoClient();
    let imageUrl = null;
    let needsUiRetry = false;
    try {
        console.log('--- 启动豆包生图客户端 ---');
        await client.init(headlessFlag);
        console.log(`\n任务: ${mode === 'img2img' ? '图生图' : (mode === 'fusion' ? '多图融合' : '文生图')} "${prompt}" (质量: ${quality}${ratio ? `, 比例: ${ratio}` : ''})`);
        if (mode === 'img2img') {
            console.log(`参考图片: ${refImagePath} (相似度: ${refStrength})`);
            imageUrl = await client.generateImageFromImage({ prompt, refImagePath, refStrength, quality, ratio });
        }
        else if (mode === 'fusion') {
            console.log(`融合图片: ${fuseImagePaths.join(', ')} (模式: ${fuseMode})`);
            imageUrl = await client.fuseImages({ prompt, imagePaths: fuseImagePaths, fuseMode, quality, ratio });
        }
        else {
            imageUrl = await client.generateImage({ prompt, quality, ratio });
        }
        if (!imageUrl) {
            if (headlessFlag) {
                console.log('\n⚠️ 未能获取到图片，可能触发了人机验证或网络超时。');
                needsUiRetry = true;
            }
            else {
                console.log('\n❌ 失败: 无法获取图片链接。');
            }
        }
    }
    catch (error) {
        console.error('\n❌ 发生致命错误:', error);
        if (headlessFlag) {
            needsUiRetry = true;
        }
    }
    finally {
        await client.close();
    }
    if (needsUiRetry) {
        console.log('\n=============================================');
        console.log('🔄 正在自动以 UI 模式重启，以便进行手动验证...');
        console.log('💡 如果出现验证码，请在弹出的浏览器中手动完成验证。');
        console.log('=============================================\n');
        client = new client_1.DoubaoClient();
        try {
            await client.init(false);
            console.log(`\n任务 (重试): "${prompt}" (质量: ${quality}${ratio ? `, 比例: ${ratio}` : ''})`);
            const timeout = 120000;
            if (mode === 'img2img') {
                imageUrl = await client.generateImageFromImage({ prompt, refImagePath, refStrength, quality, ratio, timeout });
            }
            else if (mode === 'fusion') {
                imageUrl = await client.fuseImages({ prompt, imagePaths: fuseImagePaths, fuseMode, quality, ratio, timeout });
            }
            else {
                imageUrl = await client.generateImage({ prompt, quality, ratio, timeout });
            }
            if (!imageUrl) {
                console.log('\n❌ 重试失败: 仍无法获取图片链接。');
            }
        }
        catch (e) {
            console.error('\n❌ UI 模式重试发生错误:', e);
        }
        finally {
            await client.close();
        }
    }
    if (imageUrl) {
        console.log('\n✅ 成功!');
        console.log('图片链接:', imageUrl);
        // Download the image
        const savedPath = await client_1.DoubaoClient.downloadImage(imageUrl, outputPath);
        if (savedPath) {
            console.log(`💾 图片已保存至: ${savedPath}`);
        }
        else {
            console.error('❌ 图片下载失败');
        }
    }
}
main();
