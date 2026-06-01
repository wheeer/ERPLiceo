import os
from pymongo import MongoClient

client = MongoClient("mongodb://root:example@localhost:27017/")
db = client["erp_emtp_db"]

print("Empleados:")
for e in db.empleados.find():
    print(e)

print("\nAsistencia:")
for a in db.asistencia.find():
    print(a)
