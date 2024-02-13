import React, { useState, useContext, useEffect } from "react";
import { LoaderContext, ProfileContext } from "../../App";
import { transactionTableData } from "../../MockData/TransactionData";
import { data } from "../../MockData/ChartData";

import Loader from "../../Components/Loader/Loader";
import Sidebar from "../../layout/Sidebar/Sidebar";
import Navbar from "../../layout/Navbar/Navbar";
import Chart from "../Home/Chart";
import TransactionDataTable from "./TransactionDataTable";
import OrderSummary from "./OrderSummary";

import "../../App.sass";
import "../../Pages/Orders/Orders.sass";
import "../../Pages/Home/Home.sass";

const Orders = () => {
  const { isLoading } = useContext(LoaderContext);
  const { userName } = useContext(ProfileContext);
  const [selectedRowId, setSelectedRowId] = useState(
    transactionTableData[0]?.id
  );
  const [chartData, setChartData] = useState(data);
  const selectedRow = transactionTableData.find(
    (row) => row.id === selectedRowId
  );

  // Change the corresponding chart, bar graph and list data if the transaction table row is clicked
  const handleRowClick = (id) => {
    setSelectedRowId(id);
    const newChartData = chartData.map((week) => ({
      ...week,
      totalOrders: Math.floor(Math.random() * 5000) + 1000,
      ordersDelivered: Math.floor(Math.random() * 3000) + 500,
      ordersPending: Math.floor(Math.random() * 3000) + 500,
    }));
    setChartData(newChartData);
  };

  useEffect(() => {
    document.title = "Orders | Admin Dashboard";
  }, []);

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : (
        <main className="dashboard_container_main">
          <Sidebar />
          <div className="dashboard_container_right_panel">
            <Navbar />
            <div className="order_info_container_div">
              <h4
                style={{
                  fontWeight: 700,
                  margin: "0.5rem 0 0 0",
                  padding: "0 0.5rem",
                  color: "#20B2AA",
                }}
              >
                Orders handled by Admin | {userName}
              </h4>
              <div className="order_div_wrapper">
                <OrderSummary selectedRow={selectedRow} />
                <div className="charts_container">
                  <Chart
                    title="Order handled by Admin ( Last 4 weeks)"
                    data={chartData}
                    fillColor1="#2196f3"
                    fillColor2="#4caf50"
                    fillColor3="#ff9800"
                    onRowClick={handleRowClick}
                  />
                </div>
              </div>
              <div className="transaction_list_div">
                <h4 className="transaction_list_div_title">
                  Last Transactions
                </h4>
                <TransactionDataTable
                  onRowClick={handleRowClick}
                  tableRows={transactionTableData}
                />
              </div>
            </div>
          </div>
        </main>
      )}
    </>
  );
};

export default Orders;
