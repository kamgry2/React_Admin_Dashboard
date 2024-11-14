const {WebClient} = require('@slack/web-api');

const {execSync} = require('child_process');

const {OpenAI} = require('openai');

const axios = require('axios');

const sharp = require('sharp');

const openAIKey =

    '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';

const openai = new OpenAI({

    apiKey: openAIKey

});

const token = 'xoxb-8008866173111-8023412206835-v22t1pPPIGeKTswpi9D64qkA';

const webSlackClient = new WebClient(token);

const channelId = 'C080RTRS3PW';



const getGPTResponse = async (request) => {

    try {

        const response = await openai.chat.completions.create({

            model: 'gpt-4',

            messages: [

                {role: 'system', content: 'Jesteś pomocnym asystentem.'},



                {role: 'user', content: request}

            ]

        });

        return response.choices[0].message.content;

    } catch (error) {

        console.error(error);

    }

};



const generateAIImage = async (imagePrompt) => {

    try {

        console.log("## Step : Initial image generating with Dall-e ...");

        const response = await openai.images.generate({

            model: 'dall-e-3',

            prompt: imagePrompt,

            n: 1,

            size: '1024x1024'

        });

        const imageUrl = response.data[0].url;

        return imageUrl;

    } catch (error) {

        console.error('Error generating image:', error.response?.data || error.message);

        throw new Error('Failed to generate image');

    }

};



async function sendImageToSlack(imageUrl, qaReport) {

    try {

        console.log("## Step : Sending image with report into slack ...");

        const response = await axios.get(imageUrl, {responseType: 'arraybuffer'});

        const imageBuffer = Buffer.from(response.data);

        const resizedImageBuffer = await sharp(imageBuffer).resize(256, 256).toBuffer();

        await webSlackClient.files.uploadV2({

            channel_id: channelId,

            filename: 'difficulty_level.png',

            file: resizedImageBuffer,

            initial_comment: qaReport

        });

        console.log('Image sent to Slack!');

    } catch (error) {

        console.error('Error sending image to Slack:', error.data || error.message);

    }

}



function getChangedFiles() {

    try {

        const output = execSync('git diff --name-only HEAD~1 HEAD').toString();

        return output.trim().split('\n').filter(Boolean);

    } catch (error) {

        console.error('Error getting changed files:', error);

        return [];

    }

}



function getFileDiffs(files) {

    const diffs = {};

    files.forEach((file) => {

        try {

            const diff = execSync(`git diff HEAD~1 HEAD -- ${file}`).toString();

            diffs[file] = diff;

        } catch (error) {

            console.error(`Error getting diff for file ${file}:`, error);

        }

    });

    return diffs;

}



function preparePrompt(fileDiffs) {

    const projectDescription = 'Projekt: Aplikacja webowa do zarządzania zadaniami...';

    let prompt = `${projectDescription}\n\nZmiany w plikach:\n`;

    let totalLength = 0;

    const MAX_TOKENS = 3000;



    for (const [file, diff] of Object.entries(fileDiffs)) {

        const diffLength = diff.length;

        if (totalLength + diffLength > MAX_TOKENS) {

            prompt += `- \`${file}\`: (zmiany pominięte ze względu na limit)\n`;

            continue;

        }

        prompt += `- \`${file}\`:\n\`\`\`\n${diff}\n\`\`\`\n`;

        totalLength += diffLength;

    }



    prompt += `

Please analyze the above changes and generate a QA report that includes:

1. The exact changes made to the application.

2. The parts of the application affected.

3. Specifically, what the QA team should test.

4. Potential side effects or additional areas requiring attention.

Give me answer in english.

`;

    return prompt;

}



async function getDifficultyLevel(qaReportContent) {

    try {

        console.log("## Step: Detecting changes risk level based on QA report ...");



        const response = await openai.chat.completions.create({

            model: 'gpt-4',

            messages: [

                {role: 'system', content: 'Jesteś QA team leadem.'},

                {

                    role: 'user',

                    content:

                        `Dostajesz od zespołu QA raport zmian które powstały w wyniku ostatniego merge requesta, 

                        musisz go przeanalizować: 1) pod kontem trudności testowania; 2) ryzykiem powstania ewentualnych bugów, 

                        jako wynik analizy zmian, masz zwrócić mi tylko wartość integer od 1 do 4, gdzie 1 - niegroźne zmiany, 

                        łatwe do testowania; 4 - duże i skomplikowane zmiany, ryzyko bugów i breakable changes, 

                        a oto jest text raportu od QA: ${qaReportContent}`}

            ]

        });

        return response.choices[0].message.content;

    } catch (error) {

        console.error(error);

    }

}



async function getImagePromptforCurrentDifficulty(difficultyLevel) {

    let prompt;

    if (difficultyLevel === 1) {

        prompt = "Śmieszny obrazek królika testującego prostą aplikację frontendową";

    } else if (difficultyLevel === 2) {

        prompt = "Lis programista debugujący zawiłości interfejsu użytkownika";

    } else if (difficultyLevel === 3) {

        prompt = "Grupa pingwinów próbujących naprawić skomplikowany błąd w aplikacji webowej";

    } else if (difficultyLevel === 4) {

        prompt = "Sowa w okularach intensywnie testująca zaawansowany frontend";

    } else {

        prompt = "Zwierzęta jako programiści pracujący nad aplikacją";

    }

    prompt += "; ma być bez znaków specjalnych, tylko opis, może zawierać postać lub postacie zwierzaków jako programistów. Całkowita długość promptu ma nie przekraczać 400 znaków i być bardzo prosty bez żadnych dodatkowych textów, tylko sam obrazek";



    console.log("## Step : Generating custom image prompt based on changes difficulty level ...");



    const gptGeneratedImagePrompt = await getGPTResponse(prompt);



    return gptGeneratedImagePrompt;

}



(async () => {

    const changedFiles = getChangedFiles();

    if (changedFiles.length === 0) {

        console.log('No changes detected.');

        return;

    }

    const fileDiffs = getFileDiffs(changedFiles);

    const prompt = preparePrompt(fileDiffs);

    const qaReport2 = await getGPTResponse(prompt);



    const difficultyLevel = await getDifficultyLevel(qaReport2);



    const imagePrompt = await getImagePromptforCurrentDifficulty(Number(difficultyLevel.trim()));



    //const qaReport = await generateQAReport(prompt);



    if (imagePrompt && qaReport2) {

        try {

            const imageUrl = await generateAIImage(imagePrompt);

            if (imageUrl) {

                await sendImageToSlack(imageUrl, qaReport2);

            }

        } catch (error) {

            console.error('Error in generateAndSendImage:', error);

        }

    }

})();
