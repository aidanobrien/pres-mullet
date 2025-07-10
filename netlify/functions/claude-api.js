// netlify/functions/claude-api.js
// Debug version to check deployment

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { apiKey, action = 'analyze' } = JSON.parse(event.body);

        // Return debug info to confirm new function is running
        if (action === 'test') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    status: 'NEW_FUNCTION_DEPLOYED',
                    timestamp: new Date().toISOString(),
                    model: 'claude-3-haiku-20240307',
                    message: 'If you see this, the new function is running!'
                })
            };
        }

        // For analysis, also return debug info for now
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify([{
                title: "Debug Mode",
                content: `New function deployed at ${new Date().toISOString()}. Using model: claude-3-haiku-20240307`
            }])
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Function error: ' + error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};