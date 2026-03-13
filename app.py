from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import os

app = Flask(__name__)

# MongoDB connection
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["expense_tracker"]
expenses_col = db["expenses"]

CATEGORIES = ["Food", "Transport", "Housing", "Entertainment", "Health", "Shopping", "Education", "Other"]

def serialize(doc):
    doc["_id"] = str(doc["_id"])
    if isinstance(doc.get("date"), datetime):
        doc["date"] = doc["date"].strftime("%Y-%m-%d")
    return doc

@app.route("/")
def index():
    return render_template("index.html", categories=CATEGORIES)

@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    category = request.args.get("category")
    start = request.args.get("start")
    end = request.args.get("end")
    query = {}
    if category and category != "All":
        query["category"] = category
    if start or end:
        query["date"] = {}
        if start:
            query["date"]["$gte"] = datetime.strptime(start, "%Y-%m-%d")
        if end:
            query["date"]["$lte"] = datetime.strptime(end, "%Y-%m-%d")
    docs = list(expenses_col.find(query).sort("date", -1))
    return jsonify([serialize(d) for d in docs])

@app.route("/api/expenses", methods=["POST"])
def add_expense():
    data = request.json
    if not data.get("title") or not data.get("amount") or not data.get("category"):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        amount = float(data["amount"])
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid amount"}), 400
    doc = {
        "title": data["title"].strip(),
        "amount": amount,
        "category": data["category"],
        "date": datetime.strptime(data.get("date", datetime.today().strftime("%Y-%m-%d")), "%Y-%m-%d"),
        "note": data.get("note", "").strip(),
        "created_at": datetime.utcnow()
    }
    result = expenses_col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    doc["date"] = doc["date"].strftime("%Y-%m-%d")
    return jsonify(doc), 201

@app.route("/api/expenses/<expense_id>", methods=["PUT"])
def update_expense(expense_id):
    data = request.json
    update = {}
    if "title" in data:
        update["title"] = data["title"].strip()
    if "amount" in data:
        try:
            update["amount"] = float(data["amount"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid amount"}), 400
    if "category" in data:
        update["category"] = data["category"]
    if "date" in data:
        update["date"] = datetime.strptime(data["date"], "%Y-%m-%d")
    if "note" in data:
        update["note"] = data["note"].strip()
    expenses_col.update_one({"_id": ObjectId(expense_id)}, {"$set": update})
    doc = expenses_col.find_one({"_id": ObjectId(expense_id)})
    return jsonify(serialize(doc))

@app.route("/api/expenses/<expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    expenses_col.delete_one({"_id": ObjectId(expense_id)})
    return jsonify({"deleted": expense_id})

@app.route("/api/stats", methods=["GET"])
def get_stats():
    pipeline = [
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    breakdown = {d["_id"]: {"total": d["total"], "count": d["count"]} for d in expenses_col.aggregate(pipeline)}
    total = sum(v["total"] for v in breakdown.values())
    monthly = list(expenses_col.aggregate([
        {"$group": {
            "_id": {"year": {"$year": "$date"}, "month": {"$month": "$date"}},
            "total": {"$sum": "$amount"}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
        {"$limit": 6}
    ]))
    monthly_data = [{"label": f"{d['_id']['year']}-{str(d['_id']['month']).zfill(2)}", "total": d["total"]} for d in monthly]
    return jsonify({"total": total, "breakdown": breakdown, "monthly": monthly_data})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
