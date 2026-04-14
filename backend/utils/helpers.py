def serialize(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc

def serialize_list(docs):
    return [serialize(doc) for doc in docs]

def clean_update(data_dict):
    return {k: v for k, v in data_dict.items() if v is not None}
