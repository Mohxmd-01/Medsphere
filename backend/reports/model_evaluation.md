# MedSphere AI - XGBoost/Gradient Boosting Model Evaluation Report

This report contains a comprehensive, data-driven evaluation of the clinical complication risk scoring model deployed in MedSphere AI.

> [!WARNING]
> **Data Authenticity Notice**
> The model evaluated in this report was trained on synthetic/mock medical patient data generated for development and demonstration scenarios. 
> The reported metrics are **only valid for this synthetic dataset** and **do not represent real-world clinical performance**. 
> Do not use this model or these performance metrics in an actual clinical or diagnostic environment.

---

## 1. Model & Dataset Characteristics

* **Model Class**: `GradientBoostingClassifier`
* **Dataset Used**: Seeded patient registry dataset (MongoDB `patients`, `lab_results`, and `diagnoses` collections).
* **Number of Samples**: 1001 patients
* **Target Column**: `target` (1 = High Risk of Diabetes/Hypertension Complications, 0 = Low/Moderate Risk)
* **Train / Test Split**: 80% Train / 20% Test (Random State: 42)
  * **Training Set Size**: 800 samples
  * **Test Set Size**: 201 samples

### Feature Columns Used (15 features)
The following 15 clinical parameters are leveraged by the model's feature vector:
1. `age` (Age in years)
2. `gender_male` (1 = Male, 0 = Female)
3. `bmi` (Body Mass Index)
4. `height_cm` (Height in centimeters)
5. `weight_kg` (Weight in kilograms)
6. `hba1c` (Latest Glycated Hemoglobin percentage)
7. `systolic_bp` (Latest Systolic Blood Pressure reading)
8. `diastolic_bp` (Latest Diastolic Blood Pressure reading)
9. `ldl` (Latest Low-Density Lipoprotein Cholesterol reading)
10. `glucose` (Latest Blood Glucose reading)
11. `has_diabetes` (Comorbidity marker for Diabetes)
12. `has_hypertension` (Comorbidity marker for Hypertension)
13. `has_obesity` (Comorbidity marker for Obesity)
14. `has_cad` (Comorbidity marker for Coronary Artery Disease)
15. `has_anemia` (Comorbidity marker for Anemia)

---

## 2. Evaluation Metrics (Test Set)

Below are the key classification performance metrics evaluated on the 20% validation test set (201 samples):

| Metric | Score | Formula / Description |
| --- | --- | --- |
| **Accuracy** | 1.0000 | $\frac{TP + TN}{TP + TN + FP + FN}$ |
| **Precision** | 1.0000 | $\frac{TP}{TP + FP}$ (Positive Predictive Value) |
| **Recall (Sensitivity)** | 1.0000 | $\frac{TP}{TP + FN}$ (True Positive Rate) |
| **F1 Score** | 1.0000 | $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$ |
| **ROC-AUC** | 1.0000 | Area under the Receiver Operating Characteristic curve |

### Confusion Matrix
* **True Negatives (TN)**: 19 (Low/Mod Risk correctly classified)
* **False Positives (FP)**: 0 (Low/Mod Risk misclassified as High)
* **False Negatives (FN)**: 0 (High Risk misclassified as Low/Mod)
* **True Positives (TP)**: 182 (High Risk correctly classified)

Visual confusion matrix saved as: [confusion_matrix.png](confusion_matrix.png)

---

## 3. Classification Report
```text
              precision    recall  f1-score   support

           0       1.00      1.00      1.00        19
           1       1.00      1.00      1.00       182

    accuracy                           1.00       201
   macro avg       1.00      1.00      1.00       201
weighted avg       1.00      1.00      1.00       201

```

---

## 4. Feature Importance Ranking

Features sorted by their predictive split weights (information gain) in the decision tree:

| Rank | Feature Name | Relative Importance | Description |
| --- | --- | --- | --- |
| 1 | `age` | 0.2800 | Features mapped from clinical logs |
| 2 | `ldl` | 0.2469 | Features mapped from clinical logs |
| 3 | `bmi` | 0.2375 | Features mapped from clinical logs |
| 4 | `hba1c` | 0.1520 | Features mapped from clinical logs |
| 5 | `weight_kg` | 0.0584 | Features mapped from clinical logs |
| 6 | `height_cm` | 0.0072 | Features mapped from clinical logs |
| 7 | `glucose` | 0.0069 | Features mapped from clinical logs |
| 8 | `has_hypertension` | 0.0058 | Features mapped from clinical logs |
| 9 | `has_cad` | 0.0021 | Features mapped from clinical logs |
| 10 | `has_anemia` | 0.0016 | Features mapped from clinical logs |
| 11 | `has_diabetes` | 0.0010 | Features mapped from clinical logs |
| 12 | `gender_male` | 0.0005 | Features mapped from clinical logs |
| 13 | `has_obesity` | 0.0003 | Features mapped from clinical logs |
| 14 | `systolic_bp` | 0.0000 | Features mapped from clinical logs |
| 15 | `diastolic_bp` | 0.0000 | Features mapped from clinical logs |

Visual feature importance chart saved as: [feature_importance.png](feature_importance.png)

---

## 5. Python Code Used to Compute Metrics
```python
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)

# Predictions
y_pred = model.predict(X_test)
y_pred_proba = model.predict_proba(X_test)[:, 1]

# Calculations
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_pred_proba)
cm = confusion_matrix(y_test, y_pred)
report = classification_report(y_test, y_pred)
```
