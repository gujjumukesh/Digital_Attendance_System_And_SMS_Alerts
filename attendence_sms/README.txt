ATTENDANCE MANAGEMENT SYSTEM
=========================

A comprehensive biometric attendance tracking system with SMS notifications.

Project Overview
---------------
This system manages student attendance using biometric verification and sends automated SMS notifications to parents. It features a modern web interface for administrators and integrates with biometric devices for attendance tracking.

Project Structure
----------------
/backend
  /api - Python-based REST API
  schema.sql - Database schema definitions
  demo_data.sql - Sample data for testing
  fetch_students.py - Student data management
  send_sms.py - SMS notification service

/frontend
  /src
    /components - Reusable UI components
    /pages - Main application pages
    /hooks - Custom React hooks
    /lib - Utility functions

Key Features
-----------
1. Biometric Attendance Tracking
   - Fingerprint scanner integration
   - Real-time attendance verification
   - Multiple device support

2. SMS Notifications
   - Automated absence notifications
   - Custom message templates
   - Bulk SMS sending capability

3. Web Dashboard
   - Real-time attendance monitoring
   - Student management interface
   - Attendance reports and analytics

Database Schema
--------------
Main Tables:
- total_students: Student master data
- today_attendence: Daily attendance records
- today_absent: Absentee tracking
- biometric_devices: Device management
- notification_settings: SMS templates

Setup Instructions
-----------------
1. Backend Setup:
   - Install Python dependencies
   - Configure PostgreSQL database
   - Set up environment variables in .env
   - Run database migrations

2. Frontend Setup:
   - Install Node.js dependencies
   - Configure API endpoints
   - Build and serve the application

3. Biometric Device Setup:
   - Configure device IP addresses
   - Test device connectivity
   - Verify fingerprint scanning

Environment Variables
--------------------
- DATABASE_URL: PostgreSQL connection string
- SMS_API_KEY: SMS gateway credentials
- BIOMETRIC_DEVICE_IPS: Scanner IP addresses

Development Guidelines
--------------------
1. Code Structure
   - Follow existing naming conventions
   - Maintain component hierarchy
   - Use TypeScript for type safety

2. Database Changes
   - Update schema.sql for structure changes
   - Maintain demo_data.sql for testing
   - Document new tables/columns

3. API Development
   - Follow RESTful conventions
   - Document new endpoints
   - Include error handling

Troubleshooting
--------------
1. Biometric Issues
   - Verify device connectivity
   - Check device logs
   - Test scanner hardware

2. SMS Notification Issues
   - Verify API credentials
   - Check message templates
   - Monitor SMS gateway status

3. Database Issues
   - Check connection strings
   - Verify table permissions
   - Monitor query performance

Maintenance
----------
1. Regular Tasks
   - Backup database daily
   - Monitor system logs
   - Update dependencies

2. Performance Optimization
   - Index database queries
   - Cache frequent requests
   - Optimize image processing

Support
-------
For technical support or feature requests:
- Review existing documentation
- Check system logs
- Contact system administrator

Version History
--------------
v1.0.0 - Initial Release
- Basic attendance tracking
- SMS notifications
- Web dashboard