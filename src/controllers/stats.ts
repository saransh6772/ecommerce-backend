import exp from "constants";
import { myCache } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Order } from "../models/order.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { MyDocument, calculatePercentage, getChartData, getInventories } from "../utils/features.js";

export const getDashboardStats = TryCatch(async (req, res, next) => {
    let stats = {};
    if (myCache.has("admin-stats")) { stats = JSON.parse(myCache.get("admin-stats") as string); }
    else {
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const thisMonth = {
            start: new Date(today.getFullYear(), today.getMonth(), 1),
            end: today
        }
        const lastMonth = {
            start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            end: new Date(today.getFullYear(), today.getMonth(), 0)
        }
        const thisMonthProductsPromise = Product.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        });
        const lastMonthProductsPromise = Product.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        });
        const thisMonthUsersPromise = User.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        });
        const lastMonthUsersPromise = User.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        });
        const thisMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: thisMonth.start,
                $lte: thisMonth.end
            }
        });
        const lastMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: lastMonth.start,
                $lte: lastMonth.end
            }
        });
        const lastSixMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today
            }
        });
        const latestTransactionsPromise = Order.find({}).select(["orderItems", "discount", "total", "status"]).limit(4);
        const [
            thisMonthProducts,
            thisMonthUsers,
            thisMonthOrders,
            lastMonthProducts,
            lastMonthUsers,
            lastMonthOrders,
            productCount,
            userCount,
            allOrders,
            lastSixMonthOrders,
            categories,
            femaleCount,
            latestTransactions
        ] = await Promise.all([
            thisMonthProductsPromise,
            thisMonthUsersPromise,
            thisMonthOrdersPromise,
            lastMonthProductsPromise,
            lastMonthUsersPromise,
            lastMonthOrdersPromise,
            Product.countDocuments(),
            User.countDocuments(),
            Order.find({}).select("total"),
            lastSixMonthOrdersPromise,
            Product.distinct("category"),
            User.countDocuments({ gender: "female" }),
            latestTransactionsPromise
        ]);
        const thisMonthRevenue = thisMonthOrders.reduce((total, order) => total + (order.total) || 0, 0);
        const lastMonthRevenue = lastMonthOrders.reduce((total, order) => total + (order.total) || 0, 0);
        const changePercent = {
            revenue: calculatePercentage(thisMonthRevenue, lastMonthRevenue),
            user: calculatePercentage(thisMonthUsers.length, lastMonthUsers.length),
            order: calculatePercentage(thisMonthOrders.length, lastMonthOrders.length),
            product: calculatePercentage(thisMonthProducts.length, lastMonthProducts.length)
        }
        const revenue = allOrders.reduce((total, order) => total + (order.total) || 0, 0);
        const count = {
            revenue,
            product: productCount,
            user: userCount,
            order: allOrders.length
        }
        const orderMonthCounts = getChartData({ length: 6, docArr: lastSixMonthOrders as any, today });
        const orderMonthlyRevenue = getChartData({ length: 6, docArr: lastSixMonthOrders as any, today, property: "total" });
        const categoryCount = await getInventories({ categories, productCount });
        const userRatio = {
            male: userCount - femaleCount,
            female: femaleCount
        }
        const modifiedLatestTransaction = latestTransactions.map((i) => ({
            _id: i._id,
            discount: i.discount,
            amount: i.total,
            quantity: i.orderItems.length,
            status: i.status,
        }));
        stats = {
            categoryCount,
            changePercent,
            count,
            chart: {
                order: orderMonthCounts,
                revenue: orderMonthlyRevenue
            },
            userRatio,
            latestTransactions: modifiedLatestTransaction
        };
        myCache.set("admin-stats", JSON.stringify(stats));
    }
    return res.status(200).json({
        success: true,
        stats
    });
});

export const getPieCharts = TryCatch(async (req, res, next) => {
    let charts;
    if (myCache.has("admin-pie-charts")) { charts = JSON.parse(myCache.get("admin-pie-charts") as string); }
    else {
        const allOrderPromise = Order.find({}).select([
            "total",
            "discount",
            "subtotal",
            "tax",
            "shippingCharges",
        ]);
        const [
            processingOrder,
            shippedOrder,
            deliveredOrder,
            categories,
            productCount,
            outOfStock,
            allOrders,
            allUsers,
            adminUsers,
            customerUsers,
        ] = await Promise.all([
            Order.countDocuments({ status: "Processing" }),
            Order.countDocuments({ status: "Shipped" }),
            Order.countDocuments({ status: "Delivered" }),
            Product.distinct("category"),
            Product.countDocuments(),
            Product.countDocuments({ stock: 0 }),
            allOrderPromise,
            User.find({}).select(["dob"]),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ role: "user" }),
        ]);
        const orderFullfillment = {
            processing: processingOrder,
            shipped: shippedOrder,
            delivered: deliveredOrder,
        };
        const productCategories = await getInventories({ categories, productCount });
        const stockAvailability = {
            inStock: productCount - outOfStock,
            outOfStock
        }
        const grossIncome = allOrders.reduce((total, order) => total + (order.total) || 0, 0);
        const discount = allOrders.reduce((total, order) => total + (order.discount) || 0, 0);
        const productionCost = allOrders.reduce((total, order) => total + (order.shippingCharges) || 0, 0);
        const burnt = allOrders.reduce((total, order) => total + (order.tax) || 0, 0);
        const marketingCost = Math.round(grossIncome * 0.3);
        const netMargin = grossIncome - (productionCost + burnt + marketingCost);
        const revenueDistribution = {
            netMargin,
            discount,
            productionCost,
            burnt,
            marketingCost
        };
        const customers = {
            admin: adminUsers,
            customer: customerUsers
        }

        const userAge = {
            teen: allUsers.filter(i => i.age < 20).length,
            adult: allUsers.filter(i => i.age >= 20 && i.age < 40).length,
            old: allUsers.filter(i => i.age >= 40).length,
        }
        charts = {
            revenueDistribution,
            orderFullfillment,
            productCategories,
            stockAvailability,
            customers,
            userAge
        }
        myCache.set("admin-pie-charts", JSON.stringify(charts));
    }
    return res.status(200).json({
        success: true,
        charts
    });
})

export const getBarCharts = TryCatch(async (req, res, next) => {
    let charts;
    if (myCache.has("admin-bar-charts")) { charts = JSON.parse(myCache.get("admin-bar-charts") as string); }
    else {
        const today = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const sixMonthProductPromise = Product.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today,
            },
        }).select("createdAt");
        const sixMonthUsersPromise = User.find({
            createdAt: {
                $gte: sixMonthsAgo,
                $lte: today,
            },
        }).select("createdAt");
        const twelveMonthOrdersPromise = Order.find({
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today,
            },
        }).select("createdAt");
        const [products, users, orders] = await Promise.all([
            sixMonthProductPromise,
            sixMonthUsersPromise,
            twelveMonthOrdersPromise,
        ]);
        const productCounts = getChartData({ length: 6, docArr: products as any, today });
        const userCounts = getChartData({ length: 6, docArr: users, today });
        const orderCounts = getChartData({ length: 12, docArr: orders as any, today });
        charts = {
            users: userCounts,
            products: productCounts,
            orders: orderCounts
        }
        myCache.set("admin-bar-charts", JSON.stringify(charts));
    }
    return res.status(200).json({
        success: true,
        charts
    });
})

export const getLineCharts = TryCatch(async (req, res, next) => {
    let charts;
    if (myCache.has("admin-line-charts")) charts = JSON.parse(myCache.get("admin-line-charts") as string);
    else {
        const today = new Date();
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        const baseQuery = {
            createdAt: {
                $gte: twelveMonthsAgo,
                $lte: today,
            },
        };
        const [products, users, orders] = await Promise.all([
            Product.find(baseQuery).select("createdAt"),
            User.find(baseQuery).select("createdAt"),
            Order.find(baseQuery).select(["createdAt", "discount", "total"]),
        ]);
        const productCounts = getChartData({ length: 12, today, docArr: products as any });
        const usersCounts = getChartData({ length: 12, today, docArr: users as any });
        const discount = getChartData({
            length: 12,
            today,
            docArr: orders as any,
            property: "discount",
        });
        const revenue = getChartData({
            length: 12,
            today,
            docArr: orders as any,
            property: "total",
        });
        charts = {
            users: usersCounts,
            products: productCounts,
            discount,
            revenue,
        };
        myCache.set("admin-line-charts", JSON.stringify(charts));
    }
    return res.status(200).json({
        success: true,
        charts,
    });
});