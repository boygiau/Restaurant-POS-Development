import mysql.connector

def get_db_connection():
    connection = mysql.connector.connect(
        host='localhost',
        user='root',             
        password='zxcvbnm123', 
        database='shiftpos'      
    )
    return connection