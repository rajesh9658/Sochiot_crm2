-- CreateIndex
CREATE INDEX "customers_company_id_created_at_idx" ON "customers"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "customers_company_id_customer_code_idx" ON "customers"("company_id", "customer_code");

-- CreateIndex
CREATE INDEX "product_interests_company_id_interest_level_idx" ON "product_interests"("company_id", "interest_level");
