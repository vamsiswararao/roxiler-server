const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require("sqlite");
const axios = require("axios");
const path = require("path");
const cors =require("cors");



let database;
const app = express();
const PORT = process.env.PORT || 9090;
app.use(cors());
app.use(express.json());

const initializeDBandServer = async () => {
    try {
        database = await open({
        filename: path.join(__dirname, "roxiler.db"),
        driver: sqlite3.Database,
      });
      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}/`);
      });
      createTable()
    } catch (error) {
      console.log(`Db error is ${error.message}`);
      process.exit(1);
    }
  };
  
  initializeDBandServer();
    
const createTable= async()=>{
    try{
   await database.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY,
        title TEXT,
        price REAL,
        description TEXT,
        category TEXT,
        image TEXT,
        sold BOOLEAN,
        dateOfSale DATETIME
      )
    `);
    console.log("table `transactions` created successfully");
    }catch(error){
        console.log(`Error creating table:${error.message}`)
    }
  };

app.get("/",(req,res)=>{
    res.json("Hello World!")
})

app.get("/api/database", async(req,res)=>{
    try {
        const response= await axios.get("https://s3.amazonaws.com/roxiler.com/product_transaction.json")
        const data = await response.data;
        // console.log(data)
        res.status(500).json(data);
        for (const product of data){
        await database.run(
           ` INSERT INTO transactions (id,title,price,description,category,image,sold,dateOfSale) VALUES (${product.id},"${product.title}",${product.price},"${product.description}","${product.category}","${product.image}",${product.sold},"${product.dateOfSale}")`        
        )
        
    }
    console.log("Added Successful");
    } catch (error) {
        console.error('Error initializing database:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.get("/transaction",async(req,res)=>{
const {month,search,page = 1, perPage = 10} = req.query
const offset = (page - 1) * perPage;
  const limit = parseInt(perPage);
const queryParams = [month.padStart(2, '0')];
let getTransactionQuery= `SELECT id,title,description,price,category,sold,Image,strftime('%d-%m-%Y',dateOfSale) AS dateOfSale From transactions WHERE strftime('%m', dateOfSale)="${month}" `
if(search){
  getTransactionQuery += `AND (title LIKE '%${search}%' OR description LIKE '%${search}%' OR price = '${parseFloat(search)}')`
}
getTransactionQuery += ` LIMIT ${limit} OFFSET ${offset}`;
const transactionData = await database.all(getTransactionQuery)
res.json(transactionData)
})

//api-2
app.get("/sales-details",async(req,res)=>{
    const {month} = req.query
    const getSalesQuery= `SELECT SUM(price) AS totalAmountOfSale, SUM(CASE WHEN sold = 1 THEN 1 ELSE 0 END) AS totalSoldItems,
    SUM(CASE WHEN sold = 0 THEN 1 ELSE 0 END) AS totalUnsoldItems From transactions WHERE strftime('%m', dateOfSale)="${month}"`
    const salesData = await database.all(getSalesQuery)
    res.json(salesData)
})

//api-3

app.get("/price-range",async(req,res)=>{
    const {month} = req.query
    const getPriceRangeQuery= `SELECT CASE WHEN price BETWEEN 0 AND 100 THEN '0 - 100' WHEN price BETWEEN 101 AND 200 THEN '101 - 200' WHEN price BETWEEN 201 AND 300 THEN '201 - 300' WHEN price BETWEEN 301 AND 400 THEN '301 - 400' WHEN price BETWEEN 401 AND 500 THEN '401 - 500' WHEN price BETWEEN 501 AND 600 THEN '501 - 600' WHEN price BETWEEN 601 AND 700 THEN '601 - 700' WHEN price BETWEEN 701 AND 800 THEN '701 - 800' WHEN price BETWEEN 801 AND 900 THEN '801 - 900' ELSE '901-above' END AS priceRange,COUNT(*) AS itemCount From transactions WHERE strftime('%m', dateOfSale)="${month}" GROUP BY priceRange`
    const priceRangeData = await database.all(getPriceRangeQuery)
    res.json(priceRangeData)
})

app.get("/category",async(req,res)=>{
    const {month} = req.query
    const getCategoryQuery=`SELECT category, count(*) AS itemCount From transactions WHERE strftime('%m', dateOfSale)="${month}" GROUP BY category`
    const categoryData = await database.all(getCategoryQuery)
    res.json( categoryData)
})


app.get('/combinedData', async (req, res) => {
  try {
    const { month } = req.query;
    const getSalesQuery= `SELECT SUM(price) AS totalAmountOfSale, SUM(CASE WHEN sold = 1 THEN 1 ELSE 0 END) AS totalSoldItems,
    SUM(CASE WHEN sold = 0 THEN 1 ELSE 0 END) AS totalUnsoldItems From transactions WHERE strftime('%m', dateOfSale)="${month}"`
    const salesData = await database.all(getSalesQuery)
    const getPriceRangeQuery= `SELECT CASE WHEN price BETWEEN 0 AND 100 THEN '0 - 100' WHEN price BETWEEN 101 AND 200 THEN '101 - 200' WHEN price BETWEEN 201 AND 300 THEN '201 - 300' WHEN price BETWEEN 301 AND 400 THEN '301 - 400' WHEN price BETWEEN 401 AND 500 THEN '401 - 500' WHEN price BETWEEN 501 AND 600 THEN '501 - 600' WHEN price BETWEEN 601 AND 700 THEN '601 - 700' WHEN price BETWEEN 701 AND 800 THEN '701 - 800' WHEN price BETWEEN 801 AND 900 THEN '801 - 900' ELSE '901-above' END AS priceRange,COUNT(*) AS itemCount From transactions WHERE strftime('%m', dateOfSale)="${month}" GROUP BY priceRange`
    const priceRangeData = await database.all(getPriceRangeQuery)
    const getCategoryQuery=`SELECT category, count(*) AS itemCount From transactions WHERE strftime('%m', dateOfSale)="${month}" GROUP BY category`
    const categoryData = await database.all(getCategoryQuery)
    
    res.json({
      salesData,
      priceRangeData,
      categoryData,
    });
  } catch (error) {
    console.error('Error fetching combined data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});