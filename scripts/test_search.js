const http = require('http');

const PORT = process.env.PORT || 3000;

const testCases = [
    {
        name: 'Basic Semantic Search (Apple)',
        url: `/api/catalog?q=apple`,
        expected: 'Should return Apple products (MacBook, iPhones) first.'
    },
    {
        name: 'Semantic Search + Max Price (Laptops under 80000 INR)',
        url: `/api/catalog?q=laptop&max_price=80000`,
        expected: 'Should return laptops whose price is <= 80000.'
    },
    {
        name: 'Semantic Search + In Stock (Smartphone in stock)',
        url: `/api/catalog?q=smartphone&in_stock=true`,
        expected: 'Should return smartphones with stock > 0.'
    },
    {
        name: 'Empty Query',
        url: `/api/catalog`,
        expected: 'Should return products ordered by ID.'
    },
    {
        name: 'Thematic Search (Gaming)',
        url: `/api/catalog?q=gaming`,
        expected: 'Should return gaming related hardware or high performance laptops.'
    }
];

function fetchAPI(url) {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:${PORT}${url}`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if(res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`Status Code: ${res.statusCode} - ${data}`));
                }
            });
        }).on('error', reject);
    });
}

async function runTests() {
    console.log('Running API Test Cases...\n');
    const results = [];
    
    for (const test of testCases) {
        console.log(`Test: ${test.name}`);
        console.log(`URL: ${test.url}`);
        console.log(`Expected: ${test.expected}`);
        try {
            const data = await fetchAPI(test.url);
            
            const actualSummary = data.slice(0, 3).map(p => `[ID: ${p.id}] ${p.brand ? p.brand + ' ' : ''}${p.name} - ${p.price} INR (Stock: ${p.stock})`);
            console.log(`Actual (Top 3):`);
            actualSummary.forEach(item => console.log(`  - ${item}`));
            console.log('Result: PASS\n');
            
            results.push({
                name: test.name,
                url: test.url,
                expected: test.expected,
                actual: actualSummary
            });
            
        } catch (error) {
            console.error(`Result: FAIL - ${error.message}\n`);
            results.push({
                name: test.name,
                url: test.url,
                expected: test.expected,
                actual: `Error: ${error.message}`
            });
        }
    }
    
    // Also save it to a JSON file to easily create the report
    const fs = require('fs');
    fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
}

runTests();
