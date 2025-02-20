const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Function to clean and validate URLs
const cleanUrl = (url) => {
    try {
        return new URL(url).toString();
    } catch {
        return null;
    }
};

// Function to extract PDF links
const extractPdfLinks = async (url) => {
    try {
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        const pdfLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a'))
                .filter(link => link.href.toLowerCase().includes('.pdf'))
                .map(link => ({
                    url: link.href,
                    title: link.textContent.trim()
                }));
        });

        await browser.close();
        return pdfLinks;
    } catch (error) {
        console.error('Error extracting PDF links:', error);
        return [];
    }
};

// Main search endpoint
app.post('/api/search', async (req, res) => {
    try {
        const { query } = req.body;
        const searchQuery = `${query} site:.np filetype:pdf OR ${query} Nepal Education Board NEB`;
        
        // Websites to crawl
        const targetSites = [
            'https://www.neb.gov.np',
            'https://edusanjal.com',
            'https://collegenp.com'
        ];

        let results = {
            pdfs: [],
            notes: [],
            questionPapers: [],
            relatedLinks: []
        };

        for (const site of targetSites) {
            try {
                const pdfLinks = await extractPdfLinks(site);
                results.pdfs.push(...pdfLinks);
            } catch (error) {
                console.error(`Error crawling ${site}:`, error);
            }
        }

        // Filter and categorize results
        results.pdfs = results.pdfs.filter(link => {
            const title = link.title.toLowerCase();
            return title.includes(query.toLowerCase()) || 
                   title.includes('nepal') || 
                   title.includes('neb');
        });

        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'An error occurred during the search' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 