// controllers/customerController.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

/**
 * POST /register/customer
 * Register a customer
 */
const registerCustomer = async (req, res) => {
  const { name, username, password, email, address, phone } = req.body;

  try {
    // Ensure username is unique
    const existingUser = await Customer.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = new Customer({
      name,
      username,
      password: hashedPassword,
      email,
      address,
      phone,
    });

    await customer.save();
    return res
      .status(201)
      .json({ message: 'Customer registered successfully', customer });
  } catch (error) {
    console.error('Customer registration failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /customer/dashboard
 * Return core profile plus lightweight booking & notification widgets
 */
const getDashboardData = async (req, res) => {
  try {
    const customerId = req.user?.id || req.user?._id;
    if (!customerId) return res.status(401).json({ message: 'Unauthorized' });

    const customer = await Customer.findById(customerId).select('-password').lean();
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // --- Dashboard widgets ---
    // Bookings: recent 10 (any decision), include labor summary fields
    const recentBookings = await Booking.find({ customerId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('laborId', 'name skillCategory phone location')
      .lean();

    // Booking counts by decision (requested/accepted/declined/cancelled)
    const countsAgg = await Booking.aggregate([
      { $match: { customerId: new mongoose.Types.ObjectId(customerId) } },
      { $group: { _id: '$decision', count: { $sum: 1 } } },
    ]);

    const bookingCounts = {
      requested: 0,
      accepted: 0,
      declined: 0,
      cancelled: 0,
    };
    for (const row of countsAgg) {
      bookingCounts[row._id] = row.count;
    }

    // Unread notifications (customer only)
    const unreadNotifications = await Notification.countDocuments({
      userId: customerId,
      role: 'customer',
      read: false,
    });

    // You can also include last few notifications if you want to render a feed
    const recentNotifications = await Notification.find({
      userId: customerId,
      role: 'customer',
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return res.status(200).json({
      message: 'Customer dashboard data fetched successfully',
      customer,
      // Widgets the frontend can use
      bookings: {
        recent: recentBookings,
        counts: bookingCounts,
      },
      notifications: {
        unread: unreadNotifications,
        recent: recentNotifications,
      },
    });
  } catch (error) {
    console.error('Error fetching customer dashboard data:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PUT /customers/update
 */
const updateCustomer = async (req, res) => {
  try {
    const { _id, name, email, username, address, phone } = req.body;
    const updatedCustomer = await Customer.findByIdAndUpdate(
      _id,
      { name, email, username, address, phone },
      { new: true, select: '-password' }
    ).lean();

    if (!updatedCustomer) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    return res.json({ success: true, updatedCustomer });
  } catch (error) {
    console.error('updateCustomer failed:', error);
    return res.status(500).json({ success: false, error: 'Failed to update details' });
  }
};

/**
 * DELETE /customers/delete/:id
 */
const deleteCustomer = async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('deleteCustomer failed:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
};

module.exports = {
  registerCustomer,
  getDashboardData,
  updateCustomer,
  deleteCustomer,
};
